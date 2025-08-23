
import { Router } from "express";
import { db } from "../db.js";

export const lineage = Router();

lineage.get("/lineage/upstream", (req, res) => {
  const datasetId = String(req.query.datasetId ?? "");
  if (!datasetId) return res.status(400).json({ ok: false, error: "datasetId_required" });
  const rows = db.prepare(`
    WITH RECURSIVE upstream(id, depth) AS (
      VALUES(?, 0)
      UNION
      SELECT e.sourceDatasetId, u.depth+1
      FROM lineage_edges e JOIN upstream u ON e.targetDatasetId = u.id
    )
    SELECT d.*, u.depth FROM upstream u JOIN datasets d ON u.id=d.id WHERE u.depth>0
  `).all(datasetId);
  res.json({ ok: true, items: rows });
});

lineage.get("/lineage/downstream", (req, res) => {
  const datasetId = String(req.query.datasetId ?? "");
  if (!datasetId) return res.status(400).json({ ok: false, error: "datasetId_required" });
  const rows = db.prepare(`
    WITH RECURSIVE downstream(id, depth) AS (
      VALUES(?, 0)
      UNION
      SELECT e.targetDatasetId, d.depth+1
      FROM lineage_edges e JOIN downstream d ON e.sourceDatasetId = d.id
    )
    SELECT ds.*, d.depth FROM downstream d JOIN datasets ds ON d.id=ds.id WHERE d.depth>0
  `).all(datasetId);
  res.json({ ok: true, items: rows });
});

lineage.get("/history", (req, res) => {
  const datasetId = String(req.query.datasetId ?? "");
  if (!datasetId) return res.status(400).json({ ok: false, error: "datasetId_required" });
  const jobs = db.prepare(`
    SELECT j.* FROM jobs j
    JOIN lineage_edges e ON e.jobId=j.id
    WHERE e.sourceDatasetId=? OR e.targetDatasetId=?
    ORDER BY j.startedAt DESC
  `).all(datasetId, datasetId);
  res.json({ ok: true, jobs });
});


