
import { Router } from "express";
import { z } from "zod";
import { PII_MASKERS } from "../rules.js";

export const mask = Router();

mask.post("/", (req, res) => {
  const P = z.object({ text: z.string().min(1) });
  const { text } = P.parse(req.body ?? {});
  let out = text;
  for (const m of PII_MASKERS) out = out.replace(m.re, m.replace as any);
  res.json({ masked: out });
});


