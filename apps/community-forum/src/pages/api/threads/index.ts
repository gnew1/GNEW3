
import { NextApiRequest, NextApiResponse } from "next";
import { addThread, getThreads } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const data = await getThreads();
    return res.json(data);
  }

  if (req.method === "POST") {
    const { title, author, content } = req.body;
    const thread = await addThread(title, author, content);
    return res.status(201).json(thread);
  }

  res.status(405).end();
}


