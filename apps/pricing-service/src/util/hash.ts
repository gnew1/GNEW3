
import crypto from "crypto";

export function hashToPct(s: string): number {
  const h = crypto.createHash("sha1").update(s).digest();
  // Take first 4 bytes -> 0..(2^32-1) -> 0..100
  const n = h.readUInt32BE(0);
  return (n / 0xffffffff) * 100;
}

export function qkey(x: any): string {
  return JSON.stringify(x);
}


