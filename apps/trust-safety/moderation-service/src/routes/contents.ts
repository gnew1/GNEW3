
import { Router } from "express";
import { db } from "../db.js";

export const contents = Router();

contents.get("/:id", (req, res) => {
  const c = db.prepare("SELECT * FROM contents WHERE id=?").get(req.params.id) as any;
  if (!c) return res.status(404).json({ error: "not_found" });
  const m = db.prepare("SELECT * FROM moderations WHERE contentId=? ORDER BY createdAt DESC LIMIT 1").get(req.params.id) as any;
  res.json({ content: c, lastModeration: m ?? null });
});

contents.get("/", (_req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.userId, c.lang, substr(c.text,1,160) AS preview, m.decision, m.createdAt
    FROM contents c
    LEFT JOIN moderations m ON m.contentId=c.id
    GROUP BY c.id
    ORDER BY m.createdAt DESC
    LIMIT 200
  `).all() as any[];
  res.json({ contents: rows });
});


