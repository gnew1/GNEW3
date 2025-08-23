
import crypto from "node:crypto";
import { cfg } from "./config.js";

/** Firma el XML (string) produciendo un JWS compacto (alg RS256 o ES256). */
export function signXMLtoJWS(xml: string): string | null {
  if (!cfg.signingKeyPem) return null;
  const header = { alg: selectAlg(cfg.signingKeyPem), typ: "JWT", cty: "application/xml", kid: "invoicing-key" };
  const payload = { iat: Math.floor(Date.now()/1000), sha256: sha256(xml) };
  const enc = (obj: any) => base64url(Buffer.from(JSON.stringify(obj)));
  const data = `${enc(header)}.${enc(payload)}`;
  const sig = crypto.sign(header.alg === "RS256" ? "RSA-SHA256" : "SHA256", Buffer.from(data), cfg.signingKeyPem);
  return `${data}.${base64url(sig)}`;
}

function selectAlg(pem: string): "RS256"|"ES256" {
  if (pem.includes("BEGIN RSA")) return "RS256";
  return "ES256";
}
function sha256(s: string) { return crypto.createHash("sha256").update(s).digest("hex"); }
function base64url(buf: Buffer) { return buf.toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_"); }


