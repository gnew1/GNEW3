
/**
 * GNEW · N325 — Backend de disputas/escrow
 * - Construye/valida EIP-712 para acuerdos de liquidación
 * - Cola de disputas (in-memory) y reporte de estados
 * - Endpoints de evidencia (metadatos, sin PII)
 */

import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { z } from "zod";
import { verifyTypedData, getAddress, isAddress } from "ethers";

const PORT = Number(process.env.PORT ?? 8095);
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const app: import("express").Express = express();
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));

type DisputeItem = { dealId: number; priority: number; openedAt: number; status: "open"|"l2_review"|"closed" };
const queue: DisputeItem[] = [];
const evidence: Record<number, Array<{ uri: string; hash: string; by?: string; ts: number }>> = {};

const BuildIn = z.object({
  dealId: z.number().int().positive(),
  buyerAmount: z.string(),
  sellerAmount: z.string(),
  deadline: z.number().int().positive(),
  chainId: z.number().int().positive(),
  verifyingContract: z.string().refine(isAddress, "bad_address")
});

app.post("/settlement/build", (req, res) => {
  const b = BuildIn.parse(req.body);
  const domain = { name: "GNEW-Escrow", version: "1", chainId: b.chainId, verifyingContract: b.verifyingContract };
  const types = {
    Settlement: [
      { name: "dealId", type: "uint256" },
      { name: "buyerAmount", type: "uint256" },
      { name: "sellerAmount", type: "uint256" },
      { name: "deadline", type: "uint64" }
    ]
  };
  const value = {
    dealId: b.dealId,
    buyerAmount: b.buyerAmount,
    sellerAmount: b.sellerAmount,
    deadline: b.deadline
  };
  res.json({ domain, types, value });
});

const VerifyIn = z.object({
  domain: z.object({
    name: z.string(),
    version: z.string(),
    chainId: z.number(),
    verifyingContract: z.string()
  }),
  types: z.any(),
  value: z.object({
    dealId: z.number(),
    buyerAmount: z.string(),
    sellerAmount: z.string(),
    deadline: z.number()
  }),
  sigBuyer: z.string(),
  sigSeller: z.string(),
  buyer: z.string(),
  seller: z.string()
});

app.post("/settlement/verify", (req, res) => {
  const b = VerifyIn.parse(req.body);
  const r1 = getAddress(verifyTypedData(b.domain as any, b.types as any, b.value as any, b.sigBuyer));
  const r2 = getAddress(verifyTypedData(b.domain as any, b.types as any, b.value as any, b.sigSeller));
  const ok = (r1 === getAddress(b.buyer) && r2 === getAddress(b.seller)) || (r2 === getAddress(b.buyer) && r1 === getAddress(b.seller));
  res.json({ ok, recovered: [r1, r2] });
});

const EvidenceIn = z.object({
  dealId: z.number().int().positive(),
  uri: z.string().url(),
  hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  by: z.string().optional()
});
app.post("/evidence", (req, res) => {
  const b = EvidenceIn.parse(req.body);
  evidence[b.dealId] ??= [];
  evidence[b.dealId].push({ uri: b.uri, hash: b.hash, by: b.by, ts: Date.now() });
  res.status(201).json({ ok: true, count: evidence[b.dealId].length });
});

const QueueIn = z.object({
  dealId: z.number().int().positive(),
  priority: z.number().int().min(1).max(5).default(3)
});
app.post("/queue/open", (req, res) => {
  const b = QueueIn.parse(req.body);
  queue.push({ dealId: b.dealId, priority: b.priority, openedAt: Date.now(), status: "open" });
  queue.sort((a, b) => a.priority - b.priority || a.openedAt - b.openedAt);
  res.status(201).json({ ok: true, size: queue.length });
});

app.post("/queue/:dealId/close", (req, res) => {
  const dealId = Number(req.params.dealId);
  const idx = queue.findIndex(q => q.dealId === dealId && q.status !== "closed");
  if (idx === -1) return res.status(404).json({ error: "not_found" });
  queue[idx].status = "closed";
  res.json({ ok: true });
});

app.get("/queue", (_req, res) => {
  res.json(queue);
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

if (require.main === module) {
  app.listen(PORT, () => logger.info({ msg: `escrow-disputes-service listening on :${PORT}` }));
}

export default app;


