import { ethers } from "ethers"; 
import { DidDocument } from "./utils"; 
import { fetchDoc } from "./storage"; 
 
const RPC = process.env.GNEW_RPC_URL!; 
const REGISTRY = process.env.GNEW_DID_REGISTRY!; 
const provider = new ethers.JsonRpcProvider(RPC); 
 
const REGISTRY_ABI = [ 
  "function getRecord(string did) view returns (tuple(address 
controller,string docURI,bytes32 contentHash,bool revoked,uint64 
updatedAt,uint64 version))" 
]; 
const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, 
provider); 
 
export async function resolveDid(did: string): Promise<{ 
  didDocument?: DidDocument; 
  didResolutionMetadata: any; 
  didDocumentMetadata: { deactivated?: boolean; versionId?: string; 
updated?: string }; 
  deactivated?: boolean; 
}> { 
  if (!did.startsWith("did:")) throw new Error("bad DID"); 
  // gnew driver: consulta on-chain 
  const rec = await registry.getRecord(did); 
  if (!rec || (rec.controller as string) === ethers.ZeroAddress) throw 
new Error("not anchored"); 
  if (rec.revoked) { 
    return { 
      didResolutionMetadata: { contentType: "application/did+json" }, 
      didDocumentMetadata: { deactivated: true, versionId: 
String(rec.version), updated: new Date(Number(rec.updatedAt) * 
1000).toISOString() }, 
      deactivated: true 
    }; 
  } 
  // fetch doc 
  const doc = await fetchDoc(rec.docURI); 
  // TODO: validar digest == rec.contentHash 
  return { 
    didDocument: doc, 
    didResolutionMetadata: { contentType: "application/did+json", 
anchorURI: rec.docURI }, 
    didDocumentMetadata: { versionId: String(rec.version), updated: 
new Date(Number(rec.updatedAt) * 1000).toISOString() } 
  }; 
} 
 
 
