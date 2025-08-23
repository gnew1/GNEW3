
/**
 * GNEW · N348 — Delegation Revocation Endpoint
 * Rol: Backend + Governance
 * Objetivo: Permitir a un usuario revocar su delegación activa para una propuesta.
 */

import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
app.use(bodyParser.json());

interface Delegation {
  delegator: string;
  delegate: string;
  proposalId: string;
  timestamp: number;
}

const delegations: Delegation[] = [];

app.post("/delegations/revoke", (req: Request, res: Response) => {
  const { delegator, proposalId } = req.body;

  if (!delegator || !proposalId) {
    return res.status(400).json({ error: "delegator and proposalId required" });
  }

  const before = delegations.length;
  for (let i = delegations.length - 1; i >= 0; i--) {
    if (delegations[i].delegator === delegator && delegations[i].proposalId === proposalId) {
      delegations.splice(i, 1);
    }
  }

  const removed = before - delegations.length;
  if (removed === 0) {
    return res.status(404).json({ message: "No delegation found" });
  }

  logger.info(`Delegation revoked by ${delegator} for proposal ${proposalId}`);
  res.json({ message: "Delegation revoked", removed });
});

export function startRevocationService(port = 4071) {
  return app.listen(port, () => {
    logger.info(`Delegation Revocation Service running at http://localhost:${port}`);
  });
}

// Arranque directo
if (require.main === module) {
  startRevocationService();
}

// Exposición para pruebas
export { delegations };


