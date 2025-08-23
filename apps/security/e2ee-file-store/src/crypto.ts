
import crypto from "node:crypto";

export function genDEK(): Uint8Array {
  return crypto.randomBytes(32);
}
export function aesGcmEncrypt(dek: Uint8Array, plaintext: Uint8Array): { iv: Uint8Array; ciphertext: Uint8Array; tag: Uint8Array } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, ciphertext: enc, tag };
}
export function aesGcmDecrypt(dek: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array, tag: Uint8Array): Uint8Array {
  const decipher = crypto.createDecipheriv("aes-256-gcm", dek, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return dec;
}


