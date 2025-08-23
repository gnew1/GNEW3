
import { HashAlgo, hashBytes } from "./hash.js";

export type ProofStep = { position: "left" | "right"; hashHex: string };

export function verifyMerkleInclusion(params: {
  hashAlgo: HashAlgo;
  leafHex: string;
  proof: ProofStep[];
  rootHex: string;
}): { ok: boolean; computedRoot: string } {
  let node = normHex(params.leafHex);
  for (const step of params.proof) {
    const sib = normHex(step.hashHex);
    const concat =
      step.position === "left"
        ? Buffer.concat([Buffer.from(sib, "hex"), Buffer.from(node, "hex")])
        : Buffer.concat([Buffer.from(node, "hex"), Buffer.from(sib, "hex")]);
    node = hashBytes(params.hashAlgo, concat);
  }
  const ok = node.toLowerCase() === normHex(params.rootHex);
  return { ok, computedRoot: node };
}

function normHex(h: string) {
  return h.startsWith("0x") ? h.slice(2).toLowerCase() : h.toLowerCase();
}


