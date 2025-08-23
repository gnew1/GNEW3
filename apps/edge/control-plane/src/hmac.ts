
import crypto from "node:crypto";
import { base64urlEncode } from "./base64url.js";

export function hmacSha256B64Url(key: Uint8Array, msg: string): string {
  const mac = crypto.createHmac("sha256", key).update(msg).digest();
  return base64urlEncode(mac);
}


