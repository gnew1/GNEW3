
import crypto from "node:crypto";

export type SigScheme = "ed25519"|"rsa-pss-sha256"|"ecdsa-p256-sha256"|"ecdsa-secp256k1-sha256";

export function sha256Hex(bytes: Uint8Array) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function verifySignature(params: {
  scheme: SigScheme;
  publicKeyPem: string;
  message: Uint8Array;     // bytes del contenido o del hash
  signatureBase64: string;
}) {
  const key = crypto.createPublicKey(params.publicKeyPem);
  const sig = Buffer.from(params.signatureBase64, "base64");

  switch (params.scheme) {
    case "ed25519":
      return crypto.verify(null, params.message, key, sig);
    case "rsa-pss-sha256":
      return crypto.verify("sha256", params.message, { key, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }, sig);
    case "ecdsa-p256-sha256":
    case "ecdsa-secp256k1-sha256":
      return crypto.verify("sha256", params.message, key, sig);
    default:
      return false;
  }
}


