
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";

export const lists = Router();

lists.post("/upsert", (req, res) => {
  const P = z.object({
    list: z.enum(["deny","allow","sanctions"]),
    address: z.string().min(4),
    note: z.string().optional()
  });
  const p = P.parse(req.body ?? {});
  const now = Date.now();
  db.prepare(`
    INSERT INTO lists(id,list,address,note,updatedAt) VALUES(?,?,?,?,?)
    ON CONFLICT(list,address) DO UPDATE SET note=excluded.note, updatedAt=excluded.updatedAt
  `).run(nanoid(), p.list, p.address.toLowerCase(), p.note ?? null, now);
  res.json({ ok: true });
});


