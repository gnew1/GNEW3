
import type { NextApiRequest, NextApiResponse } from "next";
import { PasskeyManager } from "../../../../../services/auth/passkeys/passkeyManager";

const manager = new PasskeyManager();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { userId, username } = req.body;
    const options = manager.generateRegistrationOptions(userId, username);
    res.status(200).json(options);
  } else if (req.method === "PUT") {
    const { userId, response } = req.body;
    const verified = manager.verifyRegistrationResponse(userId, response);
    res.status(200).json({ verified });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}


