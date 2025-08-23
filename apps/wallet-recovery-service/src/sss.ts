
import secrets from "secrets.js-grempe";

/**
 * Split a KEK (hex string) into N parts, threshold T.
 * Returns base64 shares (human transportable).
 */
export function splitKEK(hexKey: string, total: number, threshold: number): string[] {
  const shares = secrets.share(hexKey, total, threshold);
  return shares.map(s => Buffer.from(s, "utf8").toString("base64"));
}

export function combineKEK(b64shares: string[]): string {
  const sh = b64shares.map(b => Buffer.from(b, "base64").toString("utf8"));
  return secrets.combine(sh);
}


