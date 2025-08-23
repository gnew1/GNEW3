
import { sign, verify, utils } from "@noble/ed25519";

/**
 * Guardians use Ed25519 to sign approvals.
 * We only verify here; keygen is external.
 */
export async function verifyEd25519(pubkeyB64: string, msg: string, sigB64: string): Promise<boolean> {
  const pk = Buffer.from(pubkeyB64, "base64");
  const sig = Buffer.from(sigB64, "base64");
  const m = new TextEncoder().encode(msg);
  try {
    return await verify(sig, m, pk);
  } catch {
    return false;
  }
}

export function randomKEKHex(): string {
  // 32-byte KEK as hex (AES-256 key to encrypt local seed on device)
  return Buffer.from(utils.randomPrivateKey()).toString("hex");
}


