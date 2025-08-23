
/**
 * GNEW · N347 — Delegation Metrics Service
 * Rol: Backend + Governance
 * Objetivo: Calcular y exponer métricas de delegación (número total, por propuesta, top delegados).
 */

import express, { Request, Response } from "express";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();

interface Delegation {
  delegator: string;
  delegate: string;
  proposalId: string;
  timestamp: number;
}

const delegations: Delegation[] = [];

function computeMetrics() {
  const total = delegations.length;

  const byProposal: Record<string, number> = {};
  const byDelegate: Record<string, number> = {};

  for (const d of delegations) {
    byProposal[d.proposalId] = (byProposal[d.proposalId] || 0) + 1;
    byDelegate[d.delegate] = (byDelegate[d.delegate] || 0) + 1;
  }

  const topDelegates = Object.entries(byDelegate)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return { total, byProposal, topDelegates };
}

app.get("/metrics/delegations", (req: Request, res: Response) => {
  const metrics = computeMetrics();
  res.json(metrics);
});

export function startMetricsService(port = 4070) {
  return app.listen(port, () => {
    logger.info(`Delegation Metrics Service at http://localhost:${port}`);
  });
}

// Arranque directo
if (require.main === module) {
  startMetricsService();
}

// Exposición para pruebas
export { delegations, computeMetrics };


