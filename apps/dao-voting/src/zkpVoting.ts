
/**
 * GNEW · N341 — Zero-Knowledge Voting
 * Rol: Cryptography + Backend
 * Objetivo: Implementar módulo de votación con pruebas ZKP para anonimato.
 * Stack: Node/TypeScript + snarkjs (simulado).
 * Entregables: API para emitir voto y verificar prueba sin exponer identidad.
 * Pruebas/DoD: Validar emisión y verificación.
 * Seguridad & Observabilidad: Logs auditables sin deanonymizar.
 */

import express, { Request, Response } from "express";
import { generateProof, verifyProof } from "./zkpService";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
app.use(express.json());

interface VoteInput {
  choice: string;
  proof: any;
  publicSignals: any;
}

const votes: { choice: string; proof: any }[] = [];

app.post("/zkp/vote", async (req: Request, res: Response) => {
  const { choice, proof, publicSignals }: VoteInput = req.body;
  if (!choice || !proof || !publicSignals) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const valid = await verifyProof(proof, publicSignals);
  if (!valid) {
    return res.status(


