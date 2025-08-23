
import crypto from "node:crypto";
import { cfg } from "./config.js";

export function signToken(payload: any): string {
  const iat = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat };
  const msg = Buffer.from(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", cfg.hmacSecret).update(msg).digest();
  return base64url(msg) + "." + base64url(sig);
}
export function verifyToken(tok: string): { ok: boolean; body?: any; reason?: string } {
  const [m, s] = tok.split(".");
  if (!m || !s) return { ok: false, reason: "malformed" };
  const msg = Buffer.from(m.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const sig = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const expected = crypto.createHmac("sha256", cfg.hmacSecret).update(msg).digest();
  if (!timingSafeEqual(sig, expected)) return { ok: false, reason: "bad_signature" };
  const body = JSON.parse(msg.toString());
  if (body.exp && Math.floor(Date.now() / 1000) > Number(body.exp)) return { ok: false, reason: "expired" };
  return { ok: true, body };
}
function base64url(buf: Buffer) { return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}


