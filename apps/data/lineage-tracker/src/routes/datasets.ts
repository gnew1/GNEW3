
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";

export const datasets = Router();

datasets.post("/datasets", (req, res) => {
  const A = z.object({
    name: z.string().min(2),
    db: z.string().optional(),
    table: z.string().optional(),
    location: z.string().optional()
  });
  try {
    const p = A.parse(req.body ?? {});
    const id = nanoid();
    db.prepare("INSERT INTO datasets(id,name,dbName,tableName,location,createdAt) VALUES(?,?,?,?,?,?)")
      .run(id, p.name, p.db ?? null, p.table ?? null, p.location ?? null, Date.now());
    res.json({ ok: true, id });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

datasets.get("/datasets/:id", (req, res) => {
  const d = db.prepare("SELECT * FROM datasets WHERE id=?").get(req.params.id);
  if (!d) return res.status(404).json({ ok: false, error: "not_found" });
  const sources = db.prepare("SELECT * FROM lineage_edges WHERE targetDatasetId=?").all(req.params.id);
  const targets = db.prepare("SELECT * FROM lineage_edges WHERE sourceDatasetId=?").all(req.params.id);
  res.json({ ok: true, dataset: d, upstream: sources, downstream: targets });
});


