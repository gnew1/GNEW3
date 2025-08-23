
import { Router } from "express";
import { z } from "zod";
import { allProviders } from "../providers/registry.js";
import { QuoteReq, Quote } from "../models.js";

export const quotes = Router();

const Q = z.object({
  side: z.enum(["buy", "sell"]),
  fiat: z.string().min(3),
  crypto: z.string().min(3),
  amount: z.coerce.number().positive(),
  walletAddress: z.string().optional(),
  country: z.string().optional()
});

quotes.get("/", async (req, res) => {
  const q = Q.parse(req.query);
  const reqq: QuoteReq = q;
  const list: Quote[] = [];
  for (const p of allProviders()) {
    const r = await p.quote(reqq);
    if (r) list.push(r);
  }
  // orden: menor total a pagar (buy) / mayor neto (sell) -> representado por menor fee relativo
  const sorted = list.sort((a, b) => a.totalFees - b.totalFees);
  res.json({ quotes: sorted });
});


