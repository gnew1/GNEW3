
import { Router } from "express";
import { db } from "../db.js";

export const metrics = Router();

metrics.get("/", (_req, res) => {
  const rows = db.prepare("SELECT status, COUNT(*) c FROM events GROUP BY status").all() as any[];
  const total = db.prepare("SELECT COUNT(*) t FROM events").get() as any;
  const lag = db.prepare("SELECT MIN(ts) m FROM events WHERE status='pending'").get() as any;
  res.json({
    ok: true,
    counts: Object.fromEntries(rows.map(r => [r.status, r.c])),
    total: total?.t ?? 0,
    oldestPendingTs: lag?.m ?? null
  });
});


