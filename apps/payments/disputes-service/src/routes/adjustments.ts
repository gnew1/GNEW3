
import { Router } from "express";
import { db } from "../db.js";
import { z } from "zod";

export const adjustments = Router();

adjustments.get("/export", (req, res) => {
  const Q = z.object({
    since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    format: z.enum(["csv","json"]).default("json")
  });
  const p = Q.parse({ since: req.query.since, until: req.query.until, format: req.query.format ?? "json" });
  const since = new Date(p.since + "T00:00:00Z").getTime();
  const until = new Date(p.until + "T23:59:59Z").getTime();

  const rows = db.prepare(`
    SELECT * FROM adjustments WHERE createdAt BETWEEN ? AND ?
    ORDER BY createdAt ASC
  `).all(since, until) as any[];

  if (p.format === "csv") {
    const lines = ["dispute_id,partner_id,currency,kind,amount_minor,created_at"];
    for (const r of rows) lines.push([r.disputeId, r.partnerId ?? "", r.currency, r.kind, r.amountMinor, r.createdAt].join(","));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.send(lines.join("\n"));
  }
  res.json({ adjustments: rows });
});


