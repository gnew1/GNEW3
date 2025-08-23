
import { z } from "zod";
import { HashAlgo, both, hashBytes } from "./hash.js";
import { ProofStep, verifyMerkleInclusion } from "./merkle.js";
import { SigScheme, verifySignature } from "./signature.js";
import { nanoid } from "nanoid";
import { db } from "./db.js";
import { writeAudit } from "./audit.js";

const Source = z.discriminatedUnion("type", [
  z.object({ type: z.literal("base64"), data: z.string().min(1) }),
  z.object({ type: z.literal("hex"), data: z.string().min(2) }),
  z.object({ type: z.literal("url"), url: z.string().url() })
]);

const ReqSchema = z.object({
  source: Source,
  hash: z.object({
    algo: z.enum(["sha256", "sha3-256"]),
    expectedHex: z.string().min(2)
  }).optional(),
  signature: z.object({
    scheme: z.enum(["ed25519","rsa-pss-sha256","ecdsa-p256-sha256","ecdsa-secp256k1-sha256"]),
    publicKeyPem: z.string().min(20),
    signatureBase64: z.string().min(8),
    over: z.enum(["artifact","hash"]).default("artifact"),
    hashAlgo: z.enum(["sha256","sha3-256"]).default("sha256")
  }).optional(),
  merkle: z.object({
    hashAlgo: z.enum(["sha256","sha3-256"]),
    rootHex: z.string().min(2),
    leafHex: z.string().min(2).optional(),
    proof: z.array(z.object({
      position: z.enum(["left","right"]),
      hashHex: z.string().min(2)
    }) as unknown as z.ZodType<ProofStep>)
  }).optional(),
  labels: z.record(z.string()).optional()
});

export type VerifyInput = z.infer<typeof ReqSchema>;

export async function fetchBytes(src: VerifyInput["source"]): Promise<Uint8Array> {
  if (src.type === "base64") return Buffer.from(src.data, "base64");
  if (src.type === "hex") return Buffer.from(src.data.replace(/^0x/,""), "hex");
  // url
  const r = await fetch(src.url);
  if (!r.ok) throw new Error(`http_${r.status}`);
  const ab = await r.arrayBuffer();
  return new Uint8Array(ab);
}

export async function runVerification(input: VerifyInput) {
  const p = ReqSchema.parse(input);
  const bytes = await fetchBytes(p.source);
  const size = bytes.byteLength;
  const { sha256Hex, sha3_256Hex } = both(bytes);

  const checks: any = {};
  const mismatch: string[] = [];

  // Hash check
  if (p.hash) {
    const computed = (p.hash.algo === "sha256" ? sha256Hex : sha3_256Hex).toLowerCase();
    const expected = normHex(p.hash.expectedHex);
    const ok = computed === expected;
    checks.hash = { ok, computedHex: computed, expectedHex: expected };
    if (!ok) mismatch.push("hash");
  }

  // Signature check
  if (p.signature) {
    const message = p.signature.over === "artifact"
      ? bytes
      : Buffer.from(p.signature.hashAlgo === "sha256" ? sha256Hex : sha3_256Hex, "hex");
    const sig = Buffer.from(p.signature.signatureBase64, "base64");
    const ok = verifySignature({
      scheme: p.signature.scheme,
      publicKeyPem: p.signature.publicKeyPem,
      message,
      signature: sig
    });
    checks.signature = { ok, scheme: p.signature.scheme };
    if (!ok) mismatch.push("signature");
  }

  // Merkle check
  if (p.merkle) {
    const leaf = p.merkle.leafHex
      ? normHex(p.merkle.leafHex)
      : hashBytes(p.merkle.hashAlgo as HashAlgo, bytes);
    const { ok, computedRoot } = verifyMerkleInclusion({
      hashAlgo: p.merkle.hashAlgo as HashAlgo,
      leafHex: leaf,
      proof: p.merkle.proof,
      rootHex: p.merkle.rootHex
    });
    checks.merkle = { ok, leafHex: leaf, rootHex: normHex(p.merkle.rootHex), computedRoot };
    if (!ok) mismatch.push("merkle");
  }

  const ok = mismatch.length === 0;

  // Persist & audit
  const id = nanoid();
  db.prepare(`
    INSERT INTO verifications(id,ts,labels,artifactSize,sha256Hex,sha3_256Hex,ok,checks,mismatch)
    VALUES(?,?,?,?,?,?,?,?,?)
  `).run(
    id,
    Date.now(),
    JSON.stringify(p.labels ?? {}),
    size,
    sha256Hex,
    sha3_256Hex,
    ok ? 1 : 0,
    JSON.stringify(checks),
    JSON.stringify(mismatch)
  );

  writeAudit(id, "VERIFICATION", { input: redacted(p), result: { ok, mismatch } });

  return {
    id,
    ok,
    checks,
    artifact: { size, sha256Hex, sha3_256Hex },
    mismatch
  };
}

function normHex(h: string) { return h.startsWith("0x") ? h.slice(2).toLowerCase() : h.toLowerCase(); }

function redacted(p: VerifyInput) {
  // Evita guardar claves en claro
  const s = p.signature ? { ...p.signature, publicKeyPem: "<pem>" } : undefined;
  return { ...p, signature: s };
}


