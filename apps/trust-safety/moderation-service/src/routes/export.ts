
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";

export const exp = Router();

exp.get("/cases", (req, res) => {
  const Q = z.object({
    since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    format: z.enum(["json","csv"]).default("json")
  });
  const p = Q.parse({ since: req.query.since, until: req.query.until, format: (req.query.format ?? "json") as any });
  const since = new Date(p.since + "T00:00:00Z").getTime();
  const until = new Date(p.until + "T23:59:59Z").getTime();

  const rows = db.prepare(`
    SELECT m.id as moderationId, c.id as contentId, c.userId, m.decision, m.categories, m.reasons, m.createdAt
    FROM moderations m JOIN contents c ON c.id=m.contentId
    WHERE m.createdAt BETWEEN ? AND ?
    ORDER BY m.createdAt ASC
  `).all(since, until) as any[];

  if (p.format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    const head = "moderation_id,content_id,user_id,decision,created_at,categories_json,reasons_json";
    const lines = [head, ...rows.map(r => [r.moderationId, r.contentId, r.userId ?? "", r.decision, r.createdAt, JSON.stringify(r.categories), JSON.stringify(r.reasons)].join(","))];
    return res.send(lines.join("\n"));
  }
  res.json({ cases: rows });
});


