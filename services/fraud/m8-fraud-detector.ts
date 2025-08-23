
/**
 * M8: Detección Proactiva de Fraude On/Off‑Chain
 * Servicio en Node/TypeScript que combina reglas heurísticas y ML stub.
 */

import { ethers } from "ethers";
import express from "express";

interface TxAnalysis {
  txHash: string;
  score: number;
  reasons: string[];
  flagged: boolean;
}

// Stub de ML: N124 será reemplazado por modelo real
function mlScoreStub(features: any): number {
  // Genera score pseudoaleatorio
  return Math.random();
}

// Heurísticas simples
function ruleBasedCheck(tx: ethers.providers.TransactionResponse): string[] {
  const reasons: string[] = [];
  if (tx.value.gt(ethers.utils.parseEther("1000"))) {
    reasons.push("Transferencia mayor a 1000 ETH");
  }
  if (tx.gasLimit.gt(ethers.BigNumber.from("10000000"))) {
    reasons.push("Gas inusualmente alto");
  }
  return reasons;
}

export async function analyzeTransaction(
  tx: ethers.providers.TransactionResponse
): Promise<TxAnalysis> {
  const reasons = ruleBasedCheck(tx);
  const features = { gas: tx.gasLimit.toNumber(), value: tx.value.toNumber() };
  const mlScore = mlScoreStub(features);
  const score = Math.min(1, reasons.length * 0.3 + mlScore);
  return {
    txHash: tx.hash,
    score,
    reasons,
    flagged: score > 0.7,
  };
}

// API HTTP
const app = express();
app.use(express.json());

app.post("/analyze", async (req, res) => {
  const { tx } = req.body;
  if (!tx) return res.status(400).json({ error: "tx requerido" });
  const fakeTx: any = {
    hash: tx.hash || "0x123",
    value: ethers.BigNumber.from(tx.value || "0"),
    gasLimit: ethers.BigNumber.from(tx.gasLimit || "21000"),
  };
  const analysis = await analyzeTransaction(fakeTx);
  res.json(analysis);
});

if (require.main === module) {
  const port = process.env.PORT || 4008;
  app.listen(port, () =>
    console.log(`Fraud Detector M8 escuchando en puerto ${port}`)
  );
}


