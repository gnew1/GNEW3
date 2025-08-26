
import type { NextApiRequest, NextApiResponse } from "next";

export interface Thread {
  id: string;
  title: string;
  author: string;
  posts: { author: string; content: string }[];
}

const threads: Thread[] = [];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Thread | null>
) {
  const { id } = req.query;
  if (typeof id !== "string") {
    res.status(400).json(null);
    return;
  }

  const thread = threads.find(t => t.id === id) ?? null;
  if (!thread) {
    res.status(404).json(null);
    return;
  }

  res.status(200).json(thread);
import { NextApiRequest, NextApiResponse } from "next";
import { getThreadById } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const thread = await getThreadById(String(id));
  if (!thread) return res.status(404).json({ error: "Not found" });
  return res.json(thread);
}
