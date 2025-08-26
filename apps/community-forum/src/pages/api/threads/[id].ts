import { NextApiRequest, NextApiResponse } from "next";
import { getThreadById } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const thread = await getThreadById(String(id));
  if (!thread) return res.status(404).json({ error: "Not found" });
  return res.json(thread);
}
