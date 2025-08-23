
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";
import { audit } from "../audit.js";
import { pctToPpm } from "../money.js";

export const feeRules = Router();

feeRules.post("/", (req, res) => {
  const P = z.object({
    scope: z.enum(["global","partner","category"]),
    partnerId: z.string().optional(),
    category: z.string().optional(),
    currency: z.string().min(3),
    feePct: z.number().min(0).max(100),
    minFee: z.number().min(0).int(),
    capFee: z.number().min(0).int()
  });
  const p = P.parse(req.body);
  if (p.scope === "partner" && !p.partnerId) return res.status(400).json({ error: "partnerId_required" });
  if (p.scope === "category" && !p.category) return res.status(400).json({ error: "category_required" });

  const id = nanoid();
  db.prepare("INSERT INTO fee_rules(id,scope,partnerId,category,currency,feePct,minFee,capFee,createdAt) VALUES(?,?,?,?,?,?,?,?,?)")
    .run(id, p.scope, p.partnerId ?? null, p.category ?? null, p.currency, pctToPpm(p.feePct), p.minFee, p.capFee, Date.now());
  audit(id, "FEE_RULE_CREATED", p);
  res.json({ id });
});


