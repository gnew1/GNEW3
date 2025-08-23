
/**
 * GNEW · N346 — Vote Delegation Revocation Service
 * Rol: Backend + Governance
 * Objetivo: Permitir a un miembro revocar una delegación de voto previamente realizada.
 */

import express, { Request, Response } from "express";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
app.use(express.json());

interface Delegation {
  delegator: string;
  delegate: string;
  proposalId: string;
  timestamp: number;
}

const delegations: Delegation[] = [];

app.delete("/vote/delegation/revoke", (req: Request, res: Response) => {
  const { delegator, proposalId } = req.body;
  if (!delegator || !proposalId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const index = delegations.findIndex(
    (d) => d.delegator === delegator && d.proposalId === proposalId
  );

  if (index === -1) {
    return res.status(404).json({ error: "Delegation not found" });
  }

  const removed = delegations.splice(index, 1);
  logger.info({ delegator, proposalId }, "Delegation revoked");
  res.json({ success: true, removed });
});

export function startRevocationService(port = 4060) {
  return app.listen(port, () => {
    logger.info(`Revocation Service running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startRevocationService();
}


