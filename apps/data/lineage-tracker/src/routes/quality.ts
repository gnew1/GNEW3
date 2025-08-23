
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";

export const quality = Router();

quality.post("/quality/attach", (req, res) => {
  const A = z.object({
    datasetId: z.string(),
    ruleId: z.string(),
    runId: z.string(),
    status: z.string()
  });
  try {
    const p = A.parse(req.body ?? {});
    const id = nanoid();
    db.prepare("INSERT INTO quality_refs(id,datasetId,ruleId,runId,status,createdAt) VALUES(?,?,?,?,?,?)")
      .run(id, p.datasetId, p.ruleId, p.runId, p.status, Date.now());
    res.json({ ok: true, id });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

quality.get("/quality/:datasetId", (req, res) => {
  const rows = db.prepare("SELECT * FROM quality_refs WHERE datasetId=? ORDER BY createdAt DESC").all(req.params.datasetId);
  res.json({ ok: true, items: rows });
});


