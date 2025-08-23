
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";

export const revocations = Router();

const Create = z.object({
  address: z.string().min(4),
  reason: z.string().min(3),
  expiresAt: z.number().int().optional()
});

revocations.post("/", (req, res) => {
  const p = Create.parse(req.body ?? {});
  const now = Date.now();
  db.prepare("INSERT INTO revocations(id,address,reason,createdAt,expiresAt) VALUES(?,?,?,?,?)")
    .run(nanoid(), p.address.toLowerCase(), p.reason, now, p.expiresAt ?? null);
  res.json({ ok: true });
});

revocations.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM revocations WHERE expiresAt IS NULL OR expiresAt>=? ORDER BY createdAt DESC").all(Date.now()) as any[];
  res.json({ revocations: rows });
});


