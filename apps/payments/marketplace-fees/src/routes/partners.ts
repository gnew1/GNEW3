
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";
import { audit } from "../audit.js";
import { pctToPpm } from "../money.js";

export const partners = Router();

partners.post("/", (req, res) => {
  const P = z.object({
    name: z.string().min(2),
    defaultFeePct: z.number().min(0).max(100).optional(),
    withholdingPct: z.number().min(0).max(100).optional()
  });
  const p = P.parse(req.body);
  const id = nanoid();
  const now = Date.now();
  db.prepare("INSERT INTO partners(id,name,defaultFeePct,withholdingPct,createdAt) VALUES(?,?,?,?,?)")
    .run(id, p.name, pctToPpm(p.defaultFeePct ?? 0), pctToPpm(p.withholdingPct ?? 0), now);
  audit(id, "PARTNER_CREATED", p);
  res.json({ id, ...p });
});


