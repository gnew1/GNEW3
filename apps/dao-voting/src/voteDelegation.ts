
/**
 * GNEW · N345 — Vote Delegation Service
 * Rol: Backend + Governance
 * Objetivo: Implementar servicio para que los miembros deleguen su voto en otro miembro.
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

app.post("/vote/delegate", (req: Request, res: Response) => {
  const { delegator, delegate, proposalId } = req.body;
  if (!delegator || !delegate || !proposalId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const existing = delegations.find(
    (d) => d.delegator === delegator && d.proposalId === proposalId
  );
  if (existing) {
    return res.status(409).json({ error: "Delegation already exists" });
  }

  const delegation: Delegation = {
    delegator,
    delegate,
    proposalId,
    timestamp: Date.now(),
  };
  delegations.push(delegation);

  logger.info({ delegator, delegate, proposalId }, "Vote delegated");
  res.json({ success: true, delegation });
});

app.get("/vote/delegations/:proposalId", (req: Request, res: Response) => {
  const { proposalId } = req.params;
  const result = delegations.filter((d) => d.proposalId === proposalId);
  res.json(result);
});

export function startVoteDelegation(port = 4050) {
  return app.listen(port, () => {
    logger.info(`Vote Delegation API running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startVoteDelegation();
}


