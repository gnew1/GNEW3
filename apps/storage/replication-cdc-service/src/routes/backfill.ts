
import { Router } from "express";
import { db } from "../db.js";
import { nanoid } from "nanoid";
import { z } from "zod";

export const backfill = Router();

/** Agenda backfill de claves; crea eventos PUT sin duplicar (unique por key/op/src/dst/etag) */
backfill.post("/keys", (req, res) => {
  const P = z.object({
    keys: z.array(z.string().min(1)).min(1),
    srcRegion: z.enum(["primary","secondary"]),
    dstRegion: z.enum(["primary","secondary"])
  });
  try {
    const p = P.parse(req.body ?? {});
    let inserted = 0, deduped = 0;
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO events(id,op,key,etag,size,contentType,srcRegion,dstRegion,ts,status,attempts,updatedAt)
      VALUES(?,?,?,?,?,?,?,?,?,'pending',0,?)
      ON CONFLICT(key,op,IFNULL(etag,''),srcRegion,dstRegion) DO NOTHING
    `);
    for (const k of p.keys) {
      const info = stmt.run(nanoid(), "PUT", k, null, null, null, p.srcRegion, p.dstRegion, now, now);
      if (info.changes > 0) inserted++; else deduped++;
    }
    res.json({ ok: true, inserted, deduped });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});


