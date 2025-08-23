
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";
import { getProvider } from "../providers/registry.js";
import { writeAudit } from "../audit.js";
import { QuoteReq, Order } from "../models.js";

export const orders = Router();

const Create = z.object({
  side: z.enum(["buy", "sell"]),
  fiat: z.string().min(3),
  crypto: z.string().min(2),
  amount: z.number().positive(),
  walletAddress: z.string().min(10),
  provider: z.string().min(2),
  kycEvidence: z.any().optional(),
  idempotencyKey: z.string().min(8)
});

orders.post("/", async (req, res) => {
  const p = Create.parse(req.body);
  const exists = db.prepare("SELECT id FROM orders WHERE idempotencyKey=?").get(p.idempotencyKey) as { id?: string } | undefined;
  if (exists?.id) return res.json({ ok: true, id: exists.id, idempotent: true });

  const prov = getProvider(p.provider);
  if (!prov) return res.status(400).json({ error: "provider_unknown" });

  const quoteReq: QuoteReq = { side: p.side, fiat: p.fiat, crypto: p.crypto, amount: p.amount, walletAddress: p.walletAddress };
  const { order: po } = await prov.createOrder({ req: { ...quoteReq, walletAddress: p.walletAddress, idempotencyKey: p.idempotencyKey } });

  const id = nanoid();
  const now = Date.now();
  db.prepare(`
    INSERT INTO orders(id,provider,side,fiat,crypto,amountFiat,walletAddress,status,kycStatus,createdAt,updatedAt,providerRef,idempotencyKey)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, p.provider, p.side, p.fiat, p.crypto, p.amount, p.walletAddress,
    po.status ?? "created", "pending", now, now, po.providerRef, p.idempotencyKey
  );

  writeAudit(id, "ORDER_CREATED", { p, providerRef: po.providerRef });
  res.json({ ok: true, id, providerRef: po.providerRef });
});

orders.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM orders WHERE id=?").get(req.params.id) as Order | undefined;
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(row);
});


