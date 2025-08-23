
import { Router } from "express";
import { z } from "zod";
import { upsertKyc, getKyc } from "../kyc.js";
import { writeAudit } from "../audit.js";

export const kyc = Router();

kyc.get("/:walletId", (req, res) => {
  const r = getKyc(req.params.walletId);
  if (!r) return res.json({ walletId: req.params.walletId, status: "pending" });
  res.json(r);
});

kyc.post("/submit", (req, res) => {
  const P = z.object({ walletId: z.string().min(8), evidence: z.any() });
  const p = P.parse(req.body);
  const rec = upsertKyc(p.walletId, "pending", p.evidence);
  writeAudit(p.walletId, "KYC_SUBMITTED", rec);
  res.json(rec);
});


