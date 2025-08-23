
/**
 * GNEW · N345 — Gasless Voting API
 * Rol: Backend + Blockchain integration
 * Objetivo: Implementar votación sin gas mediante relayer + firma del votante.
 * Stack: Node/TypeScript.
 */

import express, { Request, Response } from "express";
import { ethers } from "ethers";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
app.use(express.json());

// Configuración de contrato y relayer
const CONTRACT_ADDRESS = process.env.VOTE_CONTRACT ?? "0x0000000000000000000000000000000000000000";
const RELAYER_KEY = process.env.RELAYER_KEY ?? "";
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL ?? "http://localhost:8545");
const relayerWallet = new ethers.Wallet(RELAYER_KEY, provider);

// ABI mínimo de ejemplo
const contractAbi = [
  "function vote(uint256 proposalId, bool support, address voter) public returns (bool)"
];
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, relayerWallet);

interface GaslessVote {
  proposalId: number;
  support: boolean;
  signature: string;
  voter: string;
}

app.post("/gasless/vote", async (req: Request, res: Response) => {
  const { proposalId, support, signature, voter }: GaslessVote = req.body;

  if (proposalId === undefined || support === undefined || !signature || !voter) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    // Construir hash del mensaje
    const messageHash = ethers.id(`${proposalId}:${support}:${voter}`);
    const recovered = ethers.verifyMessage(ethers.getBytes(messageHash), signature);

    if (recovered.toLowerCase() !== voter.toLowerCase()) {
      logger.warn({ voter, recovered }, "Invalid signature");
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Relayer envía la transacción on-chain
    const tx = await contract.vote(proposalId, support, voter);
    await tx.wait();

    logger.info({ proposalId, voter }, "Gasless vote relayed");
    return res.json({ txHash: tx.hash, proposalId, voter, support });
  } catch (err) {
    logger.error({ err }, "Gasless voting error");
    return res.status(500).json({ error: "Gasless voting failed" });
  }
});

export function startGaslessVoting(port = 5050) {
  return app.listen(port, () => {
    logger.info(`Gasless Voting API running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startGaslessVoting();
}


