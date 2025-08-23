
import { Router } from "express";
import { db } from "../db.js";

export const auditRoute = Router();

auditRoute.get("/:scopeId", (req, res) => {
  const rows = db.prepare("SELECT * FROM audit WHERE scopeId=? ORDER BY ts ASC").all(req.params.scopeId) as any[];
  res.json(rows);
});


