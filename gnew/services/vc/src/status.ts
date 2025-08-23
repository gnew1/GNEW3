/** 
* Gestión de Status List (bitstring compacta) + publicación IPFS 
*/ 
import { create as ipfsHttpClient } from "ipfs-http-client"; 
import { ethers } from "ethers"; 
const RPC = process.env.GNEW_RPC_URL!; 
const REGISTRY = process.env.STATUS_LIST_REGISTRY!; 
const ISSUER_PRIV = process.env.ISSUER_PRIVATE_KEY!; 
const ipfs = ipfsHttpClient({ url: process.env.IPFS_NODE_URL || 
"http://localhost:5001" }); 
const provider = new ethers.JsonRpcProvider(RPC); 
const wallet = new ethers.Wallet(ISSUER_PRIV, provider); 
const REG_ABI = [ 
"function computeListId(address issuer,string name) pure returns 
(bytes32)", 
"function anchorList(bytes32 listId,string uri,bytes32 contentHash) 
external", 
"function getList(bytes32 listId) view returns (tuple(string 
uri,bytes32 contentHash,uint64 version,uint64 updatedAt))" 
]; 
const registry = new ethers.Contract(REGISTRY, REG_ABI, wallet); 
export type StatusList = { 
id: string;                 
// p.ej. ipfs://CID/status-roles.json 
  purpose: "revocation" | "suspension"; 
  size: number;               // número de índices 
  encodedList: string;        // base64url de bitstring comprimida 
(Status List 2021-style) 
  contentHash: `0x${string}`; // keccak256 del JSON pretty 
}; 
 
export function makeEmptyBitstring(size: number): Uint8Array { 
  const bytes = new Uint8Array(Math.ceil(size / 8)); 
  return bytes; 
} 
 
export function setBit(bytes: Uint8Array, index: number, value: 
boolean) { 
  const byteIndex = Math.floor(index / 8); 
  const bit = index % 8; 
  if (value) bytes[byteIndex] |= (1 << (7 - bit)); 
  else bytes[byteIndex] &= ~(1 << (7 - bit)); 
} 
 
export function getBit(bytes: Uint8Array, index: number): boolean { 
  const byteIndex = Math.floor(index / 8); 
  const bit = index % 8; 
  return (bytes[byteIndex] & (1 << (7 - bit))) !== 0; 
} 
 
export async function publishStatusList(name: string, bytes: 
Uint8Array, purpose: "revocation"|"suspension" = "revocation") { 
  const payload = { 
    "@context": ["https://www.w3.org/2018/credentials/v1"], 
    "type": ["StatusList"], 
    "purpose": purpose, 
    "size": bytes.length * 8, 
    "encodedList": Buffer.from(bytes).toString("base64url") 
  }; 
  const json = JSON.stringify(payload); 
  const contentHash = ethers.keccak256(ethers.toUtf8Bytes(json)) as 
`0x${string}`; 
const { cid } = await ipfs.add(json, { pin: true }); 
const uri = `ipfs://${cid.toString()}`; 
const listId = await registry.computeListId(await 
wallet.getAddress(), name); 
const tx = await registry.anchorList(listId, uri, contentHash); 
return { uri, contentHash, name, listId: listId as `0x${string}`, 
txHash: tx.hash }; 
} 
