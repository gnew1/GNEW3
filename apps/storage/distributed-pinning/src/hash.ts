
import crypto from "node:crypto";
export function sha256Hex(buf: Uint8Array) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}


