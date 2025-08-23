
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { scoreFor } from "../heuristics.js";
import { nanoid } from "nanoid";
import { writeAudit } from "../audit.js";

export const assess = Router();

const Assess = z.object({
  address: z.string().min(4),
  chainId: z.number().int().optional(),
  signals: z.object({
    amountMinorRecent: z.number().int().nonnegative().optional(),
    txVelocity1h: z.number().int().nonnegative().optional(),
    counterparties: z.array(z.object({ address: z.string(), risk: z.number().min(0).max(100) })).optional(),
    firstSeenAt: z.number().int().optional()
  }).optional()
});

assess.post("/", (req, res) => {
  const p = Assess.parse(req.body ?? {});
  const address = p.address.toLowerCase();
  const now = Date.now();

  const exists = db.prepare("SELECT address FROM wallets WHERE address=?").get(address) as any;
  if (!exists) {
    db.prepare("INSERT INTO wallets(address,chainId,firstSeenAt,lastSeenAt,score,decision,reasons) VALUES(?,?,?,?,?,?,?)")
      .run(address, p.chainId ?? null, p.signals?.firstSeenAt ?? now, now, 0, "allow", "[]");
  }

  const { score, decision, reasons } = scoreFor(address, p.signals ?? {});
  db.prepare("UPDATE wallets SET lastSeenAt=?, score=?, decision=?, reasons=? WHERE address=?")
    .run(now, score, decision, JSON.stringify(reasons), address);

  // evento 'assessment' (para SIEM)
  db.prepare("INSERT INTO wallet_events(id,address,kind,payload,ts) VALUES(?,?,?,?,?)")
    .run(nanoid(), address, "assessment", JSON.stringify({ score, decision, reasons }), now);

  writeAudit(address, "ASSESS", { score, decision, reasons });
  res.json({ address, score, decision, reasons });
});


