
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const r = await fetch(process.env.METRICS_URL ?? "http://localhost:9090/metrics");
    const text = await r.text();
    res.setHeader("Content-Type", "text/plain");
    res.send(text);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
}


