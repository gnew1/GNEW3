
import { Router } from "express";
import { db } from "../db.js";

export const auditRoute = Router();

auditRoute.get("/:id", (req, res) => {
  const rows = db.prepare("SELECT * FROM audit WHERE scopeId=? ORDER BY ts ASC").all(req.params.id) as any[];
  res.json(rows);
});


