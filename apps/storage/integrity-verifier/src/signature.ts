
import crypto from "node:crypto";

export type SigScheme =
  | "ed25519"
  | "rsa-pss-sha256"
  | "ecdsa-p256-sha256"
  | "ecdsa-secp256k1-sha256";

export function verifySignature(params: {
  scheme: SigScheme;
  publicKeyPem: string;
  message: Uint8Array;      // bytes del artefacto o del hash (según 'over')
  signature: Uint8Array;    // firma detached
}): boolean {
  const key = crypto.createPublicKey(params.publicKeyPem);

  switch (params.scheme) {
    case "ed25519": {
      // EdDSA: digest interno (no se pasa hash)
      return crypto.verify(null, params.message, key, params.signature);
    }
    case "rsa-pss-sha256": {
      return crypto.verify("sha256", params.message, {
        key,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32
      }, params.signature);
    }
    case "ecdsa-p256-sha256":
    case "ecdsa-secp256k1-sha256": {
      // Para ECDSA se usa digest 'sha256'; la curva viene del PEM.
      return crypto.verify("sha256", params.message, key, params.signature);
    }
    default:
      return false;
  }
}


