
import crypto from "node:crypto";

export type HashAlgo = "sha256" | "sha3-256";

export function hashBytes(algo: HashAlgo, bytes: Uint8Array): string {
  return crypto.createHash(algo).update(bytes).digest("hex");
}

export function both(bytes: Uint8Array) {
  return {
    sha256Hex: hashBytes("sha256", bytes),
    sha3_256Hex: hashBytes("sha3-256", bytes)
  };
}


