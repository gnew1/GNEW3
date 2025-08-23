
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { verifySignature } from "../crypto.js";
import { writeAudit } from "../audit.js";
import { nanoid } from "nanoid";

export const signatures = Router();

const Add = z.object({
  publicKeyPem: z.string().min(20),
  scheme: z.enum(["ed25519","rsa-pss-sha256","ecdsa-p256-sha256","ecdsa-secp256k1-sha256"]),
  signatureBase64: z.string().min(16),
  over: z.enum(["content","hash"]).default("content"),
  hashAlgo: z.enum(["sha256"]).default("sha256"),
  signer: z.string().optional()
});

signatures.post("/:docId/versions/:ver/signatures", (req, res) => {
  const { docId, ver } = req.params;
  const v = Number(ver);
  const cur = db.prepare("SELECT * FROM versions WHERE docId=? AND version=?").get(docId, v) as any;
  if (!cur) return res.status(404).json({ error: "version_not_found" });

  const p = Add.parse(req.body ?? {});
  let message: Uint8Array;
  if (p.over === "content") {
    message = Buffer.from(cur.content, "base64");
  } else {
    message = Buffer.from(cur.sha256Hex, "hex");
  }
  const ok = verifySignature({ scheme: p.scheme, publicKeyPem: p.publicKeyPem, message, signatureBase64: p.signatureBase64 });
  const id = nanoid();
  db.prepare("INSERT INTO signatures(id,versionId,scheme,over,hashAlgo,signer,signatureBase64,valid,createdAt) VALUES(?,?,?,?,?,?,?,?,?)")
    .run(id, cur.id, p.scheme, p.over, p.hashAlgo, p.signer ?? null, p.signatureBase64, ok ? 1 : 0, Date.now());
  writeAudit(docId, "SIGNATURE_ATTACHED", { version: v, ok, scheme: p.scheme, over: p.over, signer: p.signer ?? null });
  res.json({ ok, id });
});


