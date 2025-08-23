
import { Router } from "express";
import { db } from "../db.js";

export const queue = Router();

queue.get("/", (_req, res) => {
  const rows = db.prepare(`
    SELECT m.id AS moderationId, c.id AS contentId, c.userId, c.lang, c.text, m.createdAt
    FROM moderations m
    JOIN contents c ON c.id=m.contentId
    WHERE m.decision='review'
    ORDER BY m.createdAt ASC
    LIMIT 200
  `).all() as any[];
  res.json({ reviewQueue: rows });
});


