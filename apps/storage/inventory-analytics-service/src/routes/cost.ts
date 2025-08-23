
import { Router } from "express";
import { db } from "../db.js";
import { cfg } from "../config.js";

export const cost = Router();

function priceFor(cls: string) {
  const p = cfg.priceUSD as any;
  return p[cls] ?? p.STANDARD;
}

cost.get("/cost/current", (req, res) => {
  const bucket = String(req.query.bucket ?? "");
  const prefix = String(req.query.prefix ?? "");
  if (!bucket) return res.status(400).json({ ok: false, error: "bucket_required" });

  const rows = db.prepare(`
    SELECT storageClass, SUM(size) as bytes
    FROM objects
    WHERE bucket=? AND key LIKE ?
    GROUP BY storageClass
  `).all(bucket, `${prefix}%`) as any[];

  const breakdown = rows.map(r => {
    const tb = Number(r.bytes ?? 0) / (1024 ** 4); // TB
    const usd = tb * priceFor(r.storageClass);
    return { storageClass: r.storageClass, tb, usd };
  });
  const totalUSD = breakdown.reduce((a, b) => a + b.usd, 0);
  res.json({ ok: true, bucket, prefix, totalUSD, breakdown });
});


