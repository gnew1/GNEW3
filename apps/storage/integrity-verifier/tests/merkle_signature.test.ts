
import crypto from "node:crypto";
import { verifyMerkleInclusion } from "../src/merkle.js";
import { hashBytes } from "../src/hash.js";
import { verifySignature } from "../src/signature.js";

test("merkle inclusion proof (sha256)", () => {
  // Árbol de 3 hojas: a,b,c (d = hash(c) se duplica para formar quad)
  const H = (x: string) => hashBytes("sha256", Buffer.from(x));
  const a = H("a"), b = H("b"), c = H("c"), d = c;
  const ab = H(Buffer.concat([Buffer.from(a, "hex"), Buffer.from(b, "hex")]).toString("binary") as any);
  const cd = H(Buffer.concat([Buffer.from(c, "hex"), Buffer.from(d, "hex")]).toString("binary") as any);
  const root = H(Buffer.concat([Buffer.from(ab, "hex"), Buffer.from(cd, "hex")]).toString("binary") as any);

  const proofForB = [
    { position: "left" as const, hashHex: a },
    { position: "right" as const, hashHex: cd }
  ];
  const { ok, computedRoot } = verifyMerkleInclusion({ hashAlgo: "sha256", leafHex: b, proof: proofForB, rootHex: root });
  expect(ok).toBe(true);
  expect(computedRoot).toBe(root);
});

test("ed25519 signature verification over bytes", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const msg = Buffer.from("hello");
  const sig = crypto.sign(null, msg, privateKey);
  const ok = verifySignature({ scheme: "ed25519", publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(), message: msg, signature: sig });
  expect(ok).toBe(true);
});


