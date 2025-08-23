
import { z } from "zod";
import { db } from "./db.js";
import { nanoid } from "nanoid";
import { copyPut, head, del } from "./s3.js";
import { writeAudit } from "./audit.js";

export const EventSchema = z.object({
  op: z.enum(["PUT", "DELETE"]),
  key: z.string().min(1),
  etag: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
  contentType: z.string().optional(),
  srcRegion: z.enum(["primary","secondary"]),
  dstRegion: z.enum(["primary","secondary"]),
  ts: z.number().int().nonnegative()
});

export function ingestEvents(payload: unknown) {
  const arr = z.object({ events: z.array(EventSchema).min(1) }).parse(payload).events;
  let inserted = 0, deduped = 0;
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO events(id,op,key,etag,size,contentType,srcRegion,dstRegion,ts,status,attempts,updatedAt)
    VALUES(?,?,?,?,?,?,?,?,?,'pending',0,?)
    ON CONFLICT(key,op,IFNULL(etag,''),srcRegion,dstRegion) DO NOTHING
  `);
  for (const ev of arr) {
    const id = nanoid();
    const info = stmt.run(id, ev.op, ev.key, ev.etag ?? null, ev.size ?? null, ev.contentType ?? null, ev.srcRegion, ev.dstRegion, ev.ts, now);
    if (info.changes > 0) { inserted++; writeAudit(ev.key, "CDC_INGEST", ev); } else { deduped++; }
  }
  return { inserted, deduped };
}

export function listEvents(params: { status?: string; keyLike?: string; limit?: number; offset?: number }) {
  const where: string[] = [];
  const args: any[] = [];
  if (params.status) { where.push("status=?"); args.push(params.status); }
  if (params.keyLike) { where.push("key LIKE ?"); args.push(`%${params.keyLike}%`); }
  const sql = `SELECT * FROM events ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ts ASC LIMIT ? OFFSET ?`;
  args.push(Math.min(500, params.limit ?? 100), params.offset ?? 0);
  const rows = db.prepare(sql).all(...args) as any[];
  return rows;
}

export async function replayBatch(params: { limit?: number; leaseSec?: number; maxRetries?: number }) {
  const limit = Math.min(200, params.limit ?? 50);
  const leaseSec = Math.min(600, params.leaseSec ?? 60);
  const maxRetries = Math.min(20, params.maxRetries ?? 5);
  const now = Date.now();
  const leaseUntil = now + leaseSec * 1000;

  // tomar pendientes
  const rows = db.prepare(`
    SELECT * FROM events
    WHERE status='pending' OR (status='in_progress' AND leaseUntil IS NOT NULL AND leaseUntil < ?)
    ORDER BY ts ASC LIMIT ?
  `).all(now, limit) as any[];

  const take = db.prepare(`UPDATE events SET status='in_progress', leaseUntil=?, updatedAt=? WHERE id=?`);
  for (const r of rows) take.run(leaseUntil, now, r.id);

  let done = 0, failed = 0, processed = 0;
  for (const ev of rows) {
    processed++;
    try {
      if (ev.op === "PUT") {
        // completar info si falta etag/size/contentType
        let ct = ev.contentType, et = ev.etag;
        if (!ct || !et) {
          try {
            const h = await head(ev.srcRegion, ev.key);
            ct = ct ?? h.contentType; et = et ?? h.etag;
            db.prepare("UPDATE events SET etag=?, size=IFNULL(size, ?), contentType=IFNULL(contentType, ?) WHERE id=?")
              .run(et, h.size, h.contentType, ev.id);
          } catch {/* no fatal */}
        }
        const out = await copyPut(ev.srcRegion, ev.dstRegion, ev.key, ct ?? undefined);
        db.prepare("UPDATE events SET status='done', targetEtag=?, attempts=attempts+1, updatedAt=? WHERE id=?")
          .run(out.etag ?? null, Date.now(), ev.id);
        writeAudit(ev.key, "CDC_REPLAY_PUT_OK", { src: ev.srcRegion, dst: ev.dstRegion, etag: et, targetEtag: out.etag });
        done++;
      } else if (ev.op === "DELETE") {
        await del(ev.dstRegion, ev.key);
        db.prepare("UPDATE events SET status='done', attempts=attempts+1, updatedAt=? WHERE id=?")
          .run(Date.now(), ev.id);
        writeAudit(ev.key, "CDC_REPLAY_DEL_OK", { dst: ev.dstRegion });
        done++;
      }
    } catch (e: any) {
      const attempts = (db.prepare("SELECT attempts FROM events WHERE id=?").get(ev.id) as any)?.attempts ?? 0;
      const nextStatus = attempts + 1 >= maxRetries ? "error" : "pending";
      db.prepare("UPDATE events SET status=?, attempts=attempts+1, lastError=?, leaseUntil=NULL, updatedAt=? WHERE id=?")
        .run(nextStatus, String(e?.message ?? e), Date.now(), ev.id);
      writeAudit(ev.key, "CDC_REPLAY_FAIL", { error: String(e?.message ?? e) });
      failed++;
    }
  }
  return { processed, done, failed };
}

export function requeue(ids?: string[], allErrors?: boolean) {
  if (allErrors) {
    const info = db.prepare("UPDATE events SET status='pending', attempts=0, updatedAt=? WHERE status='error'")
      .run(Date.now());
    return { requeued: info.changes };
  }
  if (ids && ids.length) {
    const stmt = db.prepare("UPDATE events SET status='pending', attempts=0, updatedAt=? WHERE id=?");
    let n = 0;
    for (const id of ids) n += stmt.run(Date.now(), id).changes;
    return { requeued: n };
  }
  return { requeued: 0 };
}


