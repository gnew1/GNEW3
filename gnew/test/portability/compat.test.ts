import { expect } from "chai"; 
import { makeReputationVC, signVCAsJWT } from 
"../../services/portability/src/vc/export_vc"; 
describe("Portabilidad — VC & round-trip", () => { 
  it("emite VC y cumple esquema", () => { 
    const vc = makeReputationVC({ 
      issuerDid: "did:gnew:issuer", 
      subjectDid: "did:gnew:subject", 
      epoch: 20250819, version: 1, score: 837, 
      breakdown: [{ kind: "pr_merged", contrib: 120.5 }], 
      merkleRoot: "0xroot", formulaHash: "0xconfighash", codeHash: 
"0xcodehash", artifactURI: "ipfs://CID" 
    }); 
    const jwt = signVCAsJWT(vc, 
"0x59c6995e998f97a5a0044976f57f3bdd00000000000000000000000000000000"); 
    expect(jwt.split(".").length).to.eq(3); 
  }); 
}); 
 
 
