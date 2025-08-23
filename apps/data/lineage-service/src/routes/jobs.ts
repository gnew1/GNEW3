
import { Router } from "express";
import { db } from "../db.js";

export const jobs = Router();

jobs.get("/:runId", (req, res) => {
  const j = db.prepare("SELECT * FROM jobs WHERE runId=?").get(req.params.runId) as any;
  if (!j) return res.status(404).json({ error: "not_found" });
  const edges = db.prepare("SELECT * FROM edges WHERE runId=?").all(req.params.runId) as any[];
  res.json({ job: j, edges });
});


