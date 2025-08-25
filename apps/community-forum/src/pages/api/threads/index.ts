
import { NextApiRequest, NextApiResponse } from "next";

const threads = [
  { id: "1", title: "Welcome to GNEW", author: "System", posts: [{ author: "System", content: "Introduce yourself!" }] }
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return res.json(threads);
  if (req.method === "POST") {
    const { title, author, content } = req.body;
    const id = String(Date.now());
    const thread = { id, title, author, posts: [{ author, content }] };
    // In real app, this would persist to database
    // threads.push(thread);
    return res.status(201).json(thread);
  }
  res.status(405).end();
}


