
import crypto from "node:crypto";
import { db } from "../db.js";
import { cfg } from "../config.js";

function encAtRest(pem: string): string {
  if (!cfg.localKmsPass) return pem;
  // demo XOR with pass bytes (NO es cripto fuerte; solo ejemplo)
  const pass = Buffer.from(cfg.localKmsPass);
  const buf = Buffer.from(pem);
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ pass[i % pass.length];
  return out.toString("base64");
}
function decAtRest(stored: string): string {
  if (!cfg.localKmsPass) return stored;
  const pass = Buffer.from(cfg.localKmsPass);
  const buf = Buffer.from(stored, "base64");
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ pass[i % pass.length];
  return out.toString();
}

export function ensureLocalKey(): { provider: "local"; version: number; publicPem: string } {
  const row = db.prepare("SELECT * FROM kms_keys WHERE provider='local' AND status='active' ORDER BY version DESC LIMIT 1").get() as any;
  if (row) return { provider: "local", version: row.version, publicPem: row.publicPem };
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 4096, publicExponent: 0x10001 });
  const pub = publicKey.export({ type: "pkcs1", format: "pem" }).toString();
  const priv = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
  const version = 1 + (db.prepare("SELECT COALESCE(MAX(version),0) v FROM kms_keys WHERE provider='local'").get() as any).v;
  const id = `local:${version}`;
  db.prepare("INSERT INTO kms_keys(id,provider,version,publicPem,privatePemEnc,status,createdAt) VALUES(?,?,?,?,?,?,?)")
    .run(id, "local", version, pub, encAtRest(priv), "active", Date.now());
  return { provider: "local", version, publicPem: pub };
}

export function rotateLocalKey(): { provider: "local"; version: number } {
  const cur = db.prepare("SELECT * FROM kms_keys WHERE provider='local' AND status='active' ORDER BY version DESC LIMIT 1").get() as any;
  if (cur) db.prepare("UPDATE kms_keys SET status='retired' WHERE id=?").run(cur.id);
  const { version } = ensureLocalKey();
  return { provider: "local", version };
}

function getPrivatePem(version: number): string {
  const row = db.prepare("SELECT privatePemEnc FROM kms_keys WHERE provider='local' AND version=?").get(version) as any;
  if (!row) throw new Error("kms_key_not_found");
  return decAtRest(row.privatePemEnc);
}

export function kmsWrapDEK_local(dek: Uint8Array, version: number): string {
  const pub = db.prepare("SELECT publicPem FROM kms_keys WHERE provider='local' AND version=?").get(version) as any;
  if (!pub) throw new Error("kms_key_not_found");
  const pubKey = crypto.createPublicKey(pub.publicPem ?? pub);
  const wrapped = crypto.publicEncrypt({ key: pubKey, oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(dek));
  return wrapped.toString("base64");
}

export function kmsUnwrapDEK_local(wrappedB64: string, version: number): Uint8Array {
  const privPem = getPrivatePem(version);
  const priv = crypto.createPrivateKey(privPem);
  const decrypted = crypto.privateDecrypt({ key: priv, oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(wrappedB64, "base64"));
  return new Uint8Array(decrypted);
}


