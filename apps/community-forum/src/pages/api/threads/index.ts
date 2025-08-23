
import { NextApiRequest, NextApiResponse } from "next";

let threads = [
  { id: "1", title: "Welcome to GNEW", author: "System", posts: [{ author: "System", content: "Introduce yourself!" }] }
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return res.json(threads);
  if (req.method === "POST") {
    const { title, author, content } = req.body;
    const id = String(Date.now());
    const thread = { id, title, author, posts: [{ author, content }] };
    threads.push(thread);
    return res.status(201).json(thread);
  }
  res.status(405).end();
}


/apps/community-forum/src/pages/api/threads/[id].ts

import { NextApiRequest, NextApiResponse } from "next";

let threads: any[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const thread = threads.find(t => t.id === id);
  if (!thread) return res.status(404).json({ error: "Not found" });
  return res.json(thread);
}


