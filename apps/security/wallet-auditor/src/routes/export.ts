
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";

export const exp = Router();

exp.get("/siem", (req, res) => {
  const Q = z.object({
    since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    format: z.enum(["jsonl","csv"]).default("jsonl")
  });
  const p = Q.parse({ since: req.query.since, until: req.query.until, format: (req.query.format ?? "jsonl") as any });

  const since = new Date(p.since + "T00:00:00Z").getTime();
  const until = new Date(p.until + "T23:59:59Z").getTime();

  const rows = db.prepare(`
    SELECT e.id, e.address, e.kind, e.payload, e.ts
    FROM wallet_events e
    WHERE ts BETWEEN ? AND ?
    ORDER BY ts ASC
  `).all(since, until) as any[];

  if (p.format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    const lines = ["id,address,kind,ts,payload_json"];
    for (const r of rows) lines.push([r.id, r.address, r.kind, r.ts, JSON.stringify(r.payload)].join(","));
    return res.send(lines.join("\n"));
  }
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  return res.send(rows.map(r => JSON.stringify(r)).join("\n"));
});


