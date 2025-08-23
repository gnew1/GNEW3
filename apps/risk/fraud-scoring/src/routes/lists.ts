
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";

export const lists = Router();

lists.post("/upsert", (req, res) => {
  const P = z.object({
    list: z.enum(["deny", "allow"]),
    kind: z.enum(["ip","email","bin","device"]),
    value: z.string().min(1),
    note: z.string().optional()
  });
  const p = P.parse(req.body);
  const now = Date.now();
  db.prepare(`
    INSERT INTO lists(id,list,kind,value,note,updatedAt) VALUES(?,?,?,?,?,?)
    ON CONFLICT(list,kind,value) DO UPDATE SET note=excluded.note, updatedAt=excluded.updatedAt
  `).run(nanoid(), p.list, p.kind, p.value, p.note ?? null, now);
  res.json({ ok: true });
});


