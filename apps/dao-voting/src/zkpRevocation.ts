
/**
 * GNEW · N343 — ZKP Vote Delegation Revocation
 * Rol: Cryptography + Backend
 * Objetivo: Implementar endpoint para revocar delegación de voto con pruebas ZKP.
 * Stack: Node/TypeScript.
 */

import express, { Request, Response } from "express";
import { verifyProof } from "./zkpService";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
app.use(express.json());

interface RevocationInput {
  delegator: string;
  proof: any;
  publicSignals: any;
}

// Memoria simulada: delegaciones
const delegations: Record<string, string> = {};

app.post("/zkp/revoke", async (req: Request, res: Response) => {
  const { delegator, proof, publicSignals }: RevocationInput = req.body;

  if (!delegator || !proof || !publicSignals) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const valid = await verifyProof(proof, publicSignals);
  if (!valid) {
    logger.warn({ delegator }, "Invalid revocation proof");
    return res.status(400).json({ error: "Invalid proof" });
  }

  if (!delegations[delegator]) {
    return res.status(404).json({ error: "No active delegation" });
  }

  delete delegations[delegator];
  logger.info({ delegator }, "Delegation revoked");
  return res.json({ status: "revoked", delegator });
});

app.get("/zkp/delegations", (_: Request, res: Response) => {
  res.json({ delegations });
});

export function startZKPRevocation(port = 4030) {
  return app.listen(port, () => {
    logger.info(`ZKP Revocation API running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startZKPRevocation();
}


