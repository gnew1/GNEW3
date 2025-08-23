
import type { NextApiRequest, NextApiResponse } from "next";
import { GasOptimizer } from "../../../../services/finops/gasOptimizer";

const optimizer = new GasOptimizer(process.env.RPC_URL || "http://localhost:8545");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { tx, name } = req.body;
    try {
      const estimation = await optimizer.estimateGas(tx, name);
      res.status(200).json(estimation);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}


