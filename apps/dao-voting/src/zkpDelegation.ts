
/**
 * GNEW · N342 — ZKP Delegated Voting
 * Rol: Cryptography + Backend
 * Objetivo: Permitir delegación de voto anónima usando pruebas de conocimiento cero.
 * Stack: Node/TypeScript.
 */

import express, { Request, Response } from "express";
import { generateProof, verifyProof } from "./zkpService";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
app.use(express.json());

interface DelegationInput {
  delegator: string; // wallet id (hash, never plain identity)
  delegatee: string; // wallet id
  proof: any;
  publicSignals: any;
}

const delegations: Record<string, string> = {}; // delegator -> delegatee

app.post("/zkp/delegate", async (req: Request, res: Response) => {
  const { delegator, delegatee, proof, publicSignals }: DelegationInput = req.body;

  if (!delegator || !delegatee || !proof || !publicSignals) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const valid = await verifyProof(proof, publicSignals);
  if (!valid) {
    logger.warn({ delegator, delegatee }, "Invalid delegation proof");
    return res.status(400).json({ error: "Invalid proof" });
  }

  delegations[delegator] = delegatee;
  logger.info({ delegator, delegatee }, "Delegation registered anonymously");
  return res.json({ status: "ok", delegator, delegatee });
});

app.get("/zkp/delegations", (_: Request, res: Response) => {
  res.json({ delegations });
});

export function startZKPDelegation(port = 4020) {
  return app.listen(port, () => {
    logger.info(`ZKP Delegation API running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startZKPDelegation();
}


