export type ReputationVC = { 
  issuer: string; 
  credentialSubject: { id: string; epoch: number; version: number; 
score: number; scoreScale: number; breakdown?: any[] }; 
  evidence: { type: "MerkleAnchor"; merkleRoot: string; formulaHash: 
string; codeHash: string; artifactURI: string }[]; 
}; 
 
export function mapOpenBadgeFromSBT(sbt: { typeName: string; image: 
string; tokenId: number; owner: string }) { 
  return { 
    "@context": ["https://w3id.org/openbadges/v3"], 
    "type": "Assertion", 
    "id": `urn:uuid:${crypto.randomUUID()}`, 
    "badge": { 
      "type": "BadgeClass", 
      "name": sbt.typeName, 
      "image": sbt.image, 
      "issuer": "https://gnew.example/issuers/dao" 
    }, 
    "recipient": { "type": "ethereumAddress", "identity": 
`eip155:1:${sbt.owner}` }, 
    "verification": { "type": "HostedBadge" }, 
    "evidence": [{ "type": "Evidence", "id": 
`eip:token/GSBT/${sbt.tokenId}` }] 
  }; 
} 
 
export function normalizeExternalScore(input: { score: number; scale?: 
number }): number { 
  const scale = input.scale ?? 1000; 
  const milli = Math.round((input.score / scale) * 1000); 
  return Math.max(0, Math.min(1000, milli)); 
} 
 
 
