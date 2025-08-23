
import { Router } from "express";
import { db } from "../db.js";

export const stats = Router();

stats.get("/inventory/stats", (req, res) => {
  const bucket = String(req.query.bucket ?? "");
  const prefix = String(req.query.prefix ?? "");
  if (!bucket) return res.status(400).json({ ok: false, error: "bucket_required" });

  const rows = db.prepare(`
    SELECT storageClass, COUNT(*) as n, SUM(size) as bytes
    FROM objects
    WHERE bucket=? AND key LIKE ?
    GROUP BY storageClass
  `).all(bucket, `${prefix}%`) as any[];

  const total = rows.reduce((a, r) => a + Number(r.bytes ?? 0), 0);
  res.json({ ok: true, bucket, prefix, totalBytes: total, byClass: rows });
});


