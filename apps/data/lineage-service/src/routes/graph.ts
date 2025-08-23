
import { Router } from "express";
import { lineageGraph, impact } from "../graph.js";

export const graph = Router();

graph.get("/", (req, res) => {
  const dataset = String(req.query.dataset ?? "");
  const depth = Number(req.query.depth ?? 2);
  const direction = (String(req.query.direction ?? "both") as any);
  const columns = String(req.query.columns ?? "0") === "1";
  if (!dataset) return res.status(400).json({ error: "dataset_required" });
  try {
    const g = lineageGraph(dataset, depth, direction, columns);
    res.json(g);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? String(e) });
  }
});

graph.get("/impact", (req, res) => {
  const dataset = String(req.query.dataset ?? "");
  const column = req.query.column ? String(req.query.column) : undefined;
  const kind = (String(req.query.kind ?? "remove") as any);
  if (!dataset) return res.status(400).json({ error: "dataset_required" });
  try {
    const out = impact(dataset, column, kind);
    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? String(e) });
  }
});


