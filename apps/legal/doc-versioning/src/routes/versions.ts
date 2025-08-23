
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { sha256Hex } from "../crypto.js";
import { writeAudit } from "../audit.js";
import { registerOnChain } from "../onchain.js";
import { diffLinesUnified } from "diff";

export const versions = Router();

const NewVersion = z.object({
  content: z.object({ type: z.enum(["base64","text"]), data: z.string().min(1) }),
  mime: z.string().optional()
});

versions.post("/:docId/versions", (req, res) => {
  const { docId } = req.params;
  const d = db.prepare("SELECT * FROM documents WHERE id=?").get(docId) as any;
  if (!d) return res.status(404).json({ error: "document_not_found" });

  const p = NewVersion.parse(req.body ?? {});
  const bytes = p.content.type === "base64" ? Buffer.from(p.content.data, "base64") : Buffer.from(p.content.data, "utf8");
  const hash = sha256Hex(bytes);

  const last = db.prepare("SELECT MAX(version) v FROM versions WHERE docId=?").get(docId) as any;
  const nextVer = Number(last?.v ?? 0) + 1;

  db.prepare("INSERT INTO versions(id,docId,version,mime,size,sha256Hex,content,createdAt) VALUES(?,?,?,?,?,?,?,?)")
    .run(cryptoRandom(), docId, nextVer, p.mime ?? null, bytes.byteLength, hash, Buffer.from(bytes).toString("base64"), Date.now());

  writeAudit(docId, "VERSION_ADDED", { version: nextVer, sha256: hash });
  res.json({ docId, version: nextVer, sha256Hex: hash });
});

versions.get("/:docId/versions/:ver/diff", (req, res) => {
  const { docId, ver } = req.params;
  const v = Number(ver);
  const cur = db.prepare("SELECT * FROM versions WHERE docId=? AND version=?").get(docId, v) as any;
  if (!cur) return res.status(404).json({ error: "version_not_found" });
  const prev = db.prepare("SELECT * FROM versions WHERE docId=? AND version=?").get(docId, v - 1) as any;
  const a = prev ? Buffer.from(prev.content, "base64").toString("utf8") : "";
  const b = Buffer.from(cur.content, "base64").toString("utf8");
  const unified = diffLinesUnified(a, b, { n: 3, lineterm: "\n" });
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(unified);
});

versions.post("/:docId/versions/:ver/register", async (req, res) => {
  const { docId, ver } = req.params;
  const v = Number(ver);
  const cur = db.prepare("SELECT * FROM versions WHERE docId=? AND version=?").get(docId, v) as any;
  if (!cur) return res.status(404).json({ error: "version_not_found" });
  try {
    const out = await registerOnChain(cur.sha256Hex, docId, v);
    if (out.ok) {
      db.prepare("UPDATE versions SET onchainRegistered=1, onchainTxHash=?, onchainNetwork=? WHERE id=?")
        .run(out.txHash, out.network, cur.id);
      writeAudit(docId, "ONCHAIN_REGISTERED", { version: v, sha256: cur.sha256Hex, tx: out.txHash, network: out.network });
    } else {
      writeAudit(docId, "ONCHAIN_REGISTER_FAIL", { version: v, reason: out.reason });
    }
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
});

function cryptoRandom() {
  return (globalThis as any).crypto?.randomUUID?.() ?? require("node:crypto").randomUUID();
}


