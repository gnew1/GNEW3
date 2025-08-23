
import { Router } from "express";
import { z } from "zod";
import { getActive } from "../state.js";
import { putStream, getObject, headObject } from "../s3.js";
import { db } from "../db.js";
import { writeAudit } from "../audit.js";
import { replicateKey } from "../replication.js";

export const objects = Router();

// PUT stream
objects.put("/:key(*)", async (req, res) => {
  const key = req.params.key;
  const region = getActive();
  try {
    const out = await putStream(region, key, req, req.headers["content-type"] as string | undefined);
    // metadata local
    db.prepare(`
      INSERT INTO objects(key, etag, size, contentType, lastRegion, createdAt, updatedAt)
      VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(key) DO UPDATE SET etag=excluded.etag, size=excluded.size, contentType=excluded.contentType, lastRegion=excluded.lastRegion, updatedAt=excluded.updatedAt
    `).run(key, out.etag, Number(req.headers["content-length"] ?? 0), String(req.headers["content-type"] ?? "application/octet-stream"), region, Date.now(), Date.now());

    // replication best-effort
    queueReplication(key).catch(() => {/* noop */});
    writeAudit(key, "PUT", { region, etag: out.etag });
    res.status(201).json({ ok: true, region, etag: out.etag });
  } catch (e: any) {
    res.status(502).json({ ok: false, error: e?.message ?? String(e) });
  }
});

// POST json base64
objects.post("/", async (req, res) => {
  const Body = z.object({ key: z.string().min(1), dataBase64: z.string().min(1), contentType: z.string().optional() });
  try {
    const p = Body.parse(req.body ?? {});
    const buf = Buffer.from(p.dataBase64, "base64");
    const out = await putStream(getActive(), p.key, buf, p.contentType);
    db.prepare(`
      INSERT INTO objects(key, etag, size, contentType, lastRegion, createdAt, updatedAt)
      VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(key) DO UPDATE SET etag=excluded.etag, size=excluded.size, contentType=excluded.contentType, lastRegion=excluded.lastRegion, updatedAt=excluded.updatedAt
    `).run(p.key, out.etag, buf.length, p.contentType ?? "application/octet-stream", getActive(), Date.now(), Date.now());
    queueReplication(p.key).catch(() => {});
    writeAudit(p.key, "PUT", { region: getActive(), etag: out.etag });
    res.status(201).json({ ok: true, etag: out.etag });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});

// GET
objects.get("/:key(*)", async (req, res) => {
  const key = req.params.key;
  const tryRepair = String(req.query.repair ?? "0") === "1";
  // 1) intenta activo
  try {
    const a = await getObject(getActive(), key);
    res.setHeader("Content-Type", a.contentType);
    if (a.contentLength) res.setHeader("Content-Length", String(a.contentLength));
    return (a.body as any).pipe(res);
  } catch {
    // 2) fallback a réplica
    try {
      const b = await getObject("secondary", key);
      res.setHeader("Content-Type", b.contentType);
      if (b.contentLength) res.setHeader("Content-Length", String(b.contentLength));
      // repair opcional (no bloqueante)
      if (tryRepair && getActive() === "primary") queueRepairFromReplica(key).catch(() => {});
      return (b.body as any).pipe(res);
    } catch (e2: any) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }
  }
});

// HEAD
objects.head("/:key(*)", async (req, res) => {
  const key = req.params.key;
  const preferReplica = String(req.query.prefer ?? "") === "replica";
  const regions = preferReplica ? (["secondary", "primary"] as const) : ([getActive(), "secondary"] as const);
  for (const r of regions) {
    try {
      const h = await headObject(r, key as string);
      res.setHeader("ETag", h.etag ?? "");
      res.setHeader("Content-Type", h.contentType);
      res.setHeader("Content-Length", String(h.contentLength));
      return res.status(200).end();
    } catch { /* try next */ }
  }
  res.status(404).end();
});

// Replication status
objects.get("/../replication/:key(*)", (req, res) => {
  const row = db.prepare("SELECT * FROM replication WHERE key=?").get(req.params.key) as any;
  if (!row) return res.json({ status: "none" });
  res.json({ key: row.key, status: row.status, primaryEtag: row.primaryEtag, secondaryEtag: row.secondaryEtag, lastError: row.lastError, updatedAt: row.updatedAt });
});

// helpers
async function queueReplication(key: string) {
  // marca pending y lanza
  db.prepare(`
    INSERT INTO replication(key, status, updatedAt)
    VALUES(?,?,?)
    ON CONFLICT(key) DO UPDATE SET status=excluded.status, updatedAt=excluded.updatedAt
  `).run(key, "pending", Date.now());
  await replicateKey(key);
}
async function queueRepairFromReplica(key: string) {
  // descarga de secundaria y sube a primaria
  try {
    const src = await getObject("secondary", key);
    const put = await putStream("primary", key, src.body, src.contentType);
    db.prepare(`
      INSERT INTO replication(key, primaryEtag, secondaryEtag, status, updatedAt)
      VALUES(?,?,?,?,?)
      ON CONFLICT(key) DO UPDATE SET primaryEtag=excluded.primaryEtag, secondaryEtag=excluded.secondaryEtag, status='ok', updatedAt=excluded.updatedAt
    `).run(key, put.etag, src.etag, Date.now());
    writeAudit(key, "REPAIR", { from: "secondary", to: "primary", etag: put.etag });
  } catch (e) {
    // ignore
  }
}


