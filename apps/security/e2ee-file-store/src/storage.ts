
import fs from "node:fs";
import path from "node:path";
import { cfg } from "./config.js";

export function ensureBlobsDir() {
  fs.mkdirSync(cfg.blobsDir, { recursive: true });
}
export function blobPath(id: string) {
  return path.join(cfg.blobsDir, `${id}.bin`);
}
export function writeBlob(id: string, iv: Uint8Array, ciphertext: Uint8Array, tag: Uint8Array) {
  ensureBlobsDir();
  const buf = Buffer.concat([iv, ciphertext, tag]);
  fs.writeFileSync(blobPath(id), buf);
}
export function readBlob(id: string): { iv: Buffer; ciphertext: Buffer; tag: Buffer } {
  const buf = fs.readFileSync(blobPath(id));
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const ciphertext = buf.subarray(12, buf.length - 16);
  return { iv, ciphertext, tag };
}


