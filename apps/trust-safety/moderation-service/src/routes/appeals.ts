
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";

export const appeals = Router();

appeals.post("/", (req, res) => {
  const P = z.object({ contentId: z.string().min(5), userId: z.string().min(2), message: z.string().min(5) });
  const p = P.parse(req.body ?? {});
  const id = nanoid();
  db.prepare("INSERT INTO appeals(id,contentId,userId,message,createdAt) VALUES(?,?,?,?,?)")
    .run(id, p.contentId, p.userId, p.message, Date.now());
  res.json({ ok: true, id });
});


