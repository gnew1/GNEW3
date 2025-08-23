import { ethers } from "ethers"; 
import { DidDocument } from "./utils"; 
import { create as ipfsHttpClient } from "ipfs-http-client"; 
 
// --- On-chain anchor --- 
 
const RPC = process.env.GNEW_RPC_URL!; 
const REGISTRY = process.env.GNEW_DID_REGISTRY!; 
const REGISTRAR_KEY = process.env.REGISTRAR_PRIVATE_KEY!; // o signer 
del controller cuando aplique 
const provider = new ethers.JsonRpcProvider(RPC); 
const wallet = new ethers.Wallet(REGISTRAR_KEY, provider); 
// ABI mínima 
const REGISTRY_ABI = [ 
"function registerByController(string did,string docURI,bytes32 
contentHash) external", 
"function registerByRegistrar(string did,address controller,string 
docURI,bytes32 contentHash) external", 
"function updateDocument(string did,string newDocURI,bytes32 
newContentHash) external", 
"function revoke(string did) external", 
"function getRecord(string did) view returns (tuple(address 
controller,string docURI,bytes32 contentHash,bool revoked,uint64 
updatedAt,uint64 version))" 
]; 
const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, wallet); 
export async function anchorOnChain(opts: { 
did: string; 
docURI?: string; 
contentHash?: `0x${string}`; 
update?: boolean; 
revoke?: boolean; 
}) { 
const { did, docURI, contentHash, update, revoke } = opts; 
if (revoke) { 
const tx = await registry.revoke(did); 
return tx.hash; 
} 
if (update) { 
    if (!docURI || !contentHash) throw new Error("missing update 
data"); 
    const tx = await registry.updateDocument(did, docURI, 
contentHash); 
    return tx.hash; 
  } 
 
  // Registro: si did es gnew/pkh y el signer es controller, usa 
registerByController. 
  // Para did:key/ION etc., usa registerByRegistrar (firmado por 
REGISTRAR_ROLE). 
  if (did.startsWith("did:gnew") || did.startsWith("did:pkh")) { 
    const tx = await registry.registerByController(did, docURI!, 
contentHash!); 
    return tx.hash; 
  } else { 
    // Controller address opcional: en este demo, usaremos 
wallet.address 
    const tx = await registry.registerByRegistrar(did, wallet.address, 
docURI!, contentHash!); 
    return tx.hash; 
  } 
} 
 
// --- Off-chain storage helpers --- 
 
export async function putDoc(doc: DidDocument, storage: "ipfs" | 
"ceramic" | "inline" = "ipfs"): Promise<string> { 
  if (storage === "inline") { 
    // Útil en tests: embebe documento en data: URI (ojo tamaño) 
    const b64 = 
Buffer.from(JSON.stringify(doc)).toString("base64url"); 
    return `data:application/did+json;base64,${b64}`; 
  } 
  if (storage === "ceramic") { 
    // En producción, integra ceramic http-client y 
TileDocument.create(...) 
    // Aquí devolvemos pseudo-URI para no requerir nodo externo en 
demo: 
    const streamId = "k3y52l7qbv1fry" + 
Math.random().toString(36).slice(2); 
    return `ceramic://${streamId}`; 
  } 
  // IPFS por defecto (requiere IPFS_NODE_URL env) 
  const ipfs = ipfsHttpClient({ url: process.env.IPFS_NODE_URL || 
"http://localhost:5001" }); 
  const { cid } = await ipfs.add(JSON.stringify(doc), { pin: true }); 
  return `ipfs://${cid.toString()}`; 
} 
 
export async function fetchDoc(uri: string): Promise<DidDocument> { 
  if (uri.startsWith("data:")) { 
    const b64 = uri.split(",")[1]; 
    return JSON.parse(Buffer.from(b64, 
"base64url").toString("utf-8")); 
  } 
  if (uri.startsWith("ipfs://")) { 
    const gw = process.env.IPFS_GATEWAY || "https://ipfs.io/ipfs/"; 
    const cid = uri.replace("ipfs://", ""); 
    const resp = await fetch(`${gw}${cid}`); 
    return (await resp.json()) as DidDocument; 
  } 
  if (uri.startsWith("ceramic://")) { 
    // Integrar ceramic client real si está disponible 
    throw new Error("ceramic fetch not implemented in demo"); 
  } 
  if (uri.startsWith("ion:")) { 
    // Long-form puede decodificarse localmente si necesario 
    throw new Error("ion long-form decode not implemented in demo"); 
  } 
  throw new Error("unknown URI scheme"); 
} 
 
 
