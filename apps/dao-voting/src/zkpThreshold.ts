
/**
 * GNEW · N344 — ZKP Threshold Voting Verification
 * Rol: Cryptography + Backend
 * Objetivo: Endpoint que valide que una votación alcanza un umbral mínimo de votos mediante ZKP.
 * Stack: Node/TypeScript.
 */

import express, { Request, Response } from "express";
import { verifyProof } from "./zkpService";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
app.use(express.json());

interface ThresholdInput {
  proposalId: string;
  threshold: number;
  proof: any;
  publicSignals: any;
}

// Memoria simulada de votos válidos
const votes: Record<string, number> = {};

app.post("/zkp/threshold", async (req: Request, res: Response) => {
  const { proposalId, threshold, proof, publicSignals }: ThresholdInput =
    req.body;

  if (!proposalId || !threshold || !proof || !publicSignals) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const valid = await verifyProof(proof, publicSignals);
  if (!valid) {
    logger.warn({ proposalId }, "Invalid threshold proof");
    return res.status(400).json({ error: "Invalid proof" });
  }

  const currentVotes = votes[proposalId] ?? 0;
  const met = currentVotes >= threshold;

  logger.info(
    { proposalId, currentVotes, threshold, met },
    "Threshold verification"
  );
  return res.json({ proposalId, currentVotes, threshold, met });
});

// API interna para registrar votos
app.post("/zkp/vote/:proposalId", (req: Request, res: Response) => {
  const { proposalId } = req.params;
  votes[proposalId] = (votes[proposalId] ?? 0) + 1;
  res.json({ proposalId, votes: votes[proposalId] });
});

export function startZKPThreshold(port = 4040) {
  return app.listen(port, () => {
    logger.info(`ZKP Threshold API running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startZKPThreshold();
}


