import { NextApiRequest, NextApiResponse } from "next";

const threads: { id: string; title: string; author: string; posts: { author: string; content: string }[] }[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const thread = threads.find(t => t.id === id);
  if (!thread) return res.status(404).json({ error: "Not found" });
  return res.json(thread);
}
