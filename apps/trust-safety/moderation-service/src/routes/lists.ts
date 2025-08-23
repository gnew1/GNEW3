
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";

export const lists = Router();

lists.post("/upsert", (req, res) => {
  const P = z.object({ list: z.enum(["denyTerms","allowTerms","denyUsers","allowUsers"]), value: z.string().min(1), note: z.string().optional() });
  const p = P.parse(req.body ?? {});
  const now = Date.now();
  db.prepare(`
    INSERT INTO lists(id,list,value,note,updatedAt) VALUES(?,?,?,?,?)
    ON CONFLICT(list,value) DO UPDATE SET note=excluded.note, updatedAt=excluded.updatedAt
  `).run(nanoid(), p.list, p.value.toLowerCase(), p.note ?? null, now);
  res.json({ ok: true });
});


