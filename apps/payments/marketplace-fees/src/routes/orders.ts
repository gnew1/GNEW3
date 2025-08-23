
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";
import { computeSplit } from "../engine.js";
import { audit } from "../audit.js";

export const orders = Router();

orders.post("/", (req, res) => {
  const P = z.object({
    partnerId: z.string().min(6),
    externalId: z.string().min(1),
    currency: z.string().min(3),
    gross: z.number().positive(), // en unidades con decimales (p.ej., 123.45)
    tax: z.number().min(0),
    decimals: z.number().int().min(0).max(4).default(2),
    category: z.string().optional()
  });
  const p = P.parse(req.body);
  const mul = 10 ** p.decimals;
  const grossMinor = Math.round(p.gross * mul);
  const taxMinor = Math.round(p.tax * mul);
  if (taxMinor > grossMinor) return res.status(400).json({ error: "tax_gt_gross" });

  const existing = db.prepare("SELECT id FROM orders WHERE partnerId=? AND externalId=?").get(p.partnerId, p.externalId) as any;
  if (existing?.id) return res.json({ id: existing.id, idempotent: true });

  const netMinor = grossMinor - taxMinor;
  const partner = db.prepare("SELECT * FROM partners WHERE id=?").get(p.partnerId) as any;
  if (!partner) return res.status(404).json({ error: "partner_not_found" });

  const { platform, partnerGross, withholding, partnerNet, rule } = computeSplit({
    partnerId: p.partnerId,
    currency: p.currency,
    netMinor,
    category: p.category ?? null,
    withholdingPctPpm: partner.withholdingPct
  });

  const id = nanoid();
  const now = Date.now();
  db.prepare("INSERT INTO orders(id,partnerId,externalId,currency,grossMinor,taxMinor,netMinor,category,createdAt) VALUES(?,?,?,?,?,?,?,?,?)")
    .run(id, p.partnerId, p.externalId, p.currency, grossMinor, taxMinor, netMinor, p.category ?? null, now);

  db.prepare("INSERT INTO splits(id,orderId,currency,platformFeeMinor,partnerGrossMinor,withholdingMinor,partnerNetMinor,createdAt) VALUES(?,?,?,?,?,?,?,?)")
    .run(nanoid(), id, p.currency, platform, partnerGross, withholding, partnerNet, now);

  // actualizar balance disponible
  const row = db.prepare("SELECT availableMinor FROM balances WHERE partnerId=? AND currency=?").get(p.partnerId, p.currency) as any;
  const newAvail = (row?.availableMinor ?? 0) + partnerNet;
  db.prepare(`
    INSERT INTO balances(partnerId,currency,availableMinor,updatedAt)
    VALUES(?,?,?,?)
    ON CONFLICT(partnerId,currency) DO UPDATE SET availableMinor=excluded.availableMinor, updatedAt=excluded.updatedAt
  `).run(p.partnerId, p.currency, newAvail, now);

  audit(id, "ORDER_SPLIT", { netMinor, platform, partnerGross, withholding, partnerNet, rule });
  res.json({
    id,
    currency: p.currency,
    decimals: p.decimals,
    amounts: {
      grossMinor, taxMinor, netMinor,
      platformFeeMinor: platform,
      partnerGrossMinor: partnerGross,
      withholdingMinor: withholding,
      partnerNetMinor: partnerNet
    }
  });
});

orders.get("/:id", (req, res) => {
  const o = db.prepare("SELECT * FROM orders WHERE id=?").get(req.params.id) as any;
  if (!o) return res.status(404).json({ error: "not_found" });
  const s = db.prepare("SELECT * FROM splits WHERE orderId=?").get(req.params.id) as any;
  res.json({ order: o, split: s });
});


