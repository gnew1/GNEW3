
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";

export const jobs = Router();

jobs.post("/jobs", (req, res) => {
  const A = z.object({
    name: z.string(),
    description: z.string().optional(),
    startedAt: z.number().optional(),
    finishedAt: z.number().optional(),
    edges: z.array(z.object({
      sourceDatasetId: z.string(),
      targetDatasetId: z.string(),
      transform: z.string().optional()
    })).default([])
  });
  try {
    const p = A.parse(req.body ?? {});
    const jobId = nanoid();
    db.prepare("INSERT INTO jobs(id,name,description,startedAt,finishedAt) VALUES(?,?,?,?,?)")
      .run(jobId, p.name, p.description ?? null, p.startedAt ?? Date.now(), p.finishedAt ?? null);
    const stmt = db.prepare("INSERT INTO lineage_edges(id,sourceDatasetId,targetDatasetId,jobId,transform,createdAt) VALUES(?,?,?,?,?,?)");
    for (const e of p.edges) {
      stmt.run(nanoid(), e.sourceDatasetId, e.targetDatasetId, jobId, e.transform ?? null, Date.now());
    }
    res.json({ ok: true, jobId, edges: p.edges.length });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});


