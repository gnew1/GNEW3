
import { Router } from "express";
import { db } from "../db.js";

export const holds = Router();

holds.get("/", (req, res) => {
  const partnerId = req.query.partnerId ? String(req.query.partnerId) : null;
  const rows = db.prepare(`
    SELECT * FROM holds WHERE (? IS NULL OR partnerId=?) AND releasedAt IS NULL
    ORDER BY createdAt DESC
  `).all(partnerId, partnerId) as any[];
  res.json({ holds: rows });
});


