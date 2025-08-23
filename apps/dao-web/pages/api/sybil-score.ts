
/**
 * API REST para consultar sybil-score (M4)
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { SybilScorer } from "../../../services/identity/sybil-score";

const scorer = new SybilScorer(
  process.env.NEO4J_URI || "bolt://localhost:7687",
  process.env.NEO4J_USER || "neo4j",
  process.env.NEO4J_PASS || "password"
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const wallet = req.query.wallet as string;
  if (!wallet) return res.status(400).json({ error: "Wallet requerida" });

  const score = await scorer.computeSybilScore(wallet);
  res.status(200).json({ wallet, sybilScore: score });
}


