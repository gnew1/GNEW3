
import { Router } from "express";
import { db } from "../db.js";

export const datasets = Router();

datasets.get("/", (req, res) => {
  const q = String(req.query.q ?? "").toLowerCase();
  const rows = q
    ? db.prepare("SELECT id,namespace,name,key,createdAt FROM datasets WHERE lower(key) LIKE ? ORDER BY key ASC LIMIT 500").all(`%${q}%`) as any[]
    : db.prepare("SELECT id,namespace,name,key,createdAt FROM datasets ORDER BY createdAt DESC LIMIT 500").all() as any[];
  res.json({ datasets: rows });
});

datasets.get("/:id", (req, res) => {
  const d = db.prepare("SELECT * FROM datasets WHERE id=?").get(req.params.id) as any;
  if (!d) return res.status(404).json({ error: "not_found" });
  const ver = db.prepare("SELECT MAX(version) v FROM dataset_versions WHERE datasetId=?").get(d.id) as any;
  const cols = db.prepare("SELECT name,type,nullable FROM columns WHERE datasetId=? AND version=? ORDER BY name ASC").all(d.id, ver?.v ?? 1) as any[];
  res.json({ dataset: d, schema: { version: ver?.v ?? 1, columns: cols } });
});


