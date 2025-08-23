
import type { NextApiRequest, NextApiResponse } from "next";
import { FieldEncryptor } from "../../../../services/data-governance/fieldEncryptor";

const encryptor = new FieldEncryptor(process.env.DATA_SECRET || "gnew-secret");
encryptor.setPolicy("email", { encrypt: true, retentionDays: 365 });
encryptor.setPolicy("phone", { encrypt: true, retentionDays: 180, anonymize: true });

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { field, value } = req.body;
    const encrypted = encryptor.encryptField(field, value);
    res.status(200).json({ encrypted });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}


