
import { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.json([
    { id: 1, title: "Quickstart Node.js", description: "Get up and running in <10min" },
    { id: 2, title: "Quickstart Python", description: "First steps in Python SDK" }
  ]);
}


