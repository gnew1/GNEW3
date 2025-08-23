export const GnewRoleSchemaV1 = { 
  $id: "https://schemas.gnew/vc/role-credential-v1.json", 
  type: "object", 
  required: ["@context", "type", "issuer", "issuanceDate", 
"credentialSubject", "credentialStatus"], 
  properties: { 
    "@context": { type: "array", items: { type: "string" } }, 
    type: { type: "array", items: { type: "string" } }, 
    issuer: { type: "string" }, // DID del emisor 
    issuanceDate: { type: "string" }, 
    expirationDate: { type: "string" }, 
    credentialSubject: { 
      type: "object", 
      required: ["id", "role", "area", "guild"], 
      properties: { 
        id: { type: "string" }, // DID del holder 
        role: { type: "string" }, 
        area: { type: "string" }, 
        guild: { type: "string" }, 
        level: { type: "string" } 
      } 
    }, 
    credentialStatus: { 
      type: "object", 
      required: ["id", "type", "statusListIndex", "statusListURI"], 
      properties: { 
        id: { type: "string" }, // statusListURI#index 
        type: { type: "string", const: "StatusListEntry" }, 
        statusListIndex: { type: "string" }, 
        statusListURI: { type: "string" } 
      } 
    }, 
    termsOfUse: { type: "array" } 
  } 
}; 
 
export const GnewAchievementSchemaV1 = { 
  $id: "https://schemas.gnew/vc/achievement-credential-v1.json", 
  type: "object", 
  required: ["@context", "type", "issuer", "issuanceDate", 
"credentialSubject", "credentialStatus"], 
  properties: { 
    "@context": { type: "array", items: { type: "string" } }, 
    type: { type: "array", items: { type: "string" } }, 
    issuer: { type: "string" }, 
    issuanceDate: { type: "string" }, 
    credentialSubject: { 
      type: "object", 
      required: ["id", "achievement", "score", "awardedAt"], 
      properties: { 
        id: { type: "string" }, 
        achievement: { type: "string" }, 
score: { type: "number" }, 
awardedAt: { type: "string" } 
} 
}, 
credentialStatus: GnewRoleSchemaV1.properties!.credentialStatus 
} 
}; 
