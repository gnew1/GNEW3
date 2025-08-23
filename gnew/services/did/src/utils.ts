import { randomBytes, createHash } from "crypto"; 
 
export type VerificationMethod = { 
id: string; 
type: "EcdsaSecp256k1RecoveryMethod2020" | 
"Ed25519VerificationKey2020"; 
controller: string; 
publicKeyMultibase?: string; 
blockchainAccountId?: string; // CAIP-10 eip155:<chainId>:<address> 
}; 
export type ServiceEndpoint = { id: string; type: string; 
serviceEndpoint: string }; 
export type DidDocument = { 
"@context": ["https://www.w3.org/ns/did/v1"]; 
id: string; 
controller?: string | string[]; 
verificationMethod?: VerificationMethod[]; 
authentication?: string[]; 
assertionMethod?: string[]; 
keyAgreement?: string[]; 
service?: ServiceEndpoint[]; 
// Opcional: metadata propia 
}; 
export function hashDidDocument(doc: DidDocument): `0x${string}` { 
const h = createHash("keccak256" as any); // node no trae 
"keccak256" nativo; se puede usar js-sha3. Demo: 
(h as any).update(JSON.stringify(doc)); 
const d = (h as any).digest("hex"); 
return ("0x" + d.slice(-64)) as `0x${string}`; // demo: trunc 
} 
// -- DID Builders -- 
export async function createGnewDID(address: string, chainId: number, 
services: ServiceEndpoint[] = []) { 
const did = `did:gnew:eip155:${chainId}:${address.toLowerCase()}`; 
const vmId = `${did}#controller`; 
  const vm: VerificationMethod = { 
    id: vmId, 
    type: "EcdsaSecp256k1RecoveryMethod2020", 
    controller: did, 
    blockchainAccountId: `eip155:${chainId}:${address.toLowerCase()}` 
  }; 
  const doc: DidDocument = { 
    "@context": ["https://www.w3.org/ns/did/v1"], 
    id: did, 
    verificationMethod: [vm], 
    authentication: [vmId], 
    assertionMethod: [vmId], 
    service: services 
  }; 
  return { did, doc }; 
} 
 
export async function createPKHDID(address: string, chainId: number, 
services: ServiceEndpoint[] = []) { 
  const did = `did:pkh:eip155:${chainId}:${address.toLowerCase()}`; 
  const vmId = `${did}#controller`; 
  const vm: VerificationMethod = { 
    id: vmId, 
    type: "EcdsaSecp256k1RecoveryMethod2020", 
    controller: did, 
    blockchainAccountId: `eip155:${chainId}:${address.toLowerCase()}` 
  }; 
  const doc: DidDocument = { 
    "@context": ["https://www.w3.org/ns/did/v1"], 
    id: did, 
    verificationMethod: [vm], 
    authentication: [vmId], 
    assertionMethod: [vmId], 
    service: services 
  }; 
  return { did, doc }; 
} 
 
export async function createKeyDID(services: ServiceEndpoint[] = []) { 
  // Demo: genera multibase 'z' con 32 bytes aleatorios (Ed25519) 
  const pk = randomBytes(32); 
  // Aquí usarías real multibase/multicodec (varint + 0xed 0x01 + key) 
y base58btc 'z...' 
  const fakeMultibase = "z" + pk.toString("hex"); 
  const did = `did:key:${fakeMultibase}`; 
  const vmId = `${did}#${fakeMultibase}`; 
  const vm: VerificationMethod = { 
    id: vmId, 
    type: "Ed25519VerificationKey2020", 
    controller: did, 
    publicKeyMultibase: fakeMultibase 
  }; 
  const doc: DidDocument = { 
    "@context": ["https://www.w3.org/ns/did/v1"], 
    id: did, 
    verificationMethod: [vm], 
    authentication: [vmId], 
    assertionMethod: [vmId], 
    keyAgreement: [vmId], 
    service: services 
  }; 
  return { did, doc }; 
} 
 
Notas: en producción usa librerías reales para multibase/multicodec y keccak256 
(p. ej. js-sha3). 
 
