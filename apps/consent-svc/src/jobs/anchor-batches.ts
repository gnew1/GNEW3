import { prisma } from "../infra/prisma"; 
import crypto from "crypto"; 
import { ethers } from "ethers"; 
import ConsentAnchor from 
"../../../contracts/artifacts/ConsentAnchor.json"; 
 
function merkleRoot(hashes: string[]): string { 
  if (hashes.length === 0) return "0x" + "0".repeat(64); 
  let layer = hashes.map(h => Buffer.from(h, "hex")); 
  while (layer.length > 1) { 
    const next: Buffer[] = []; 
    for (let i=0; i<layer.length; i+=2) { 
      const left = layer[i], right = layer[i+1] ?? left; 
      const combined = Buffer.concat([left, right]); 
      
next.push(crypto.createHash("sha256").update(combined).digest()); 
    } 
    layer = next; 
  } 
  return "0x" + layer[0].toString("hex"); 
} 
 
export async function runAnchorBatch() { 
  const unanchored = await prisma.consentEvent.findMany({ where: { 
batchId: null }, take: 2000 }); 
  if (unanchored.length === 0) return; 
 
  const hashes = unanchored.map(e => e.eventHash); 
  const root = merkleRoot(hashes); 
  const batchId = "batch_" + Date.now(); 
 
  // on-chain anchor 
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL); 
  const wallet = new ethers.Wallet(process.env.ANCHOR_PK!, provider); 
  const contract = new 
ethers.Contract(process.env.CONSENT_ANCHOR_ADDR!, ConsentAnchor.abi, 
wallet); 
  const tx = await contract.storeRoot(root, batchId); 
  const receipt = await tx.wait(); 
 
  await prisma.$transaction(async (txdb) => { 
    for (const e of unanchored) { 
      await txdb.consentEvent.update({ where: { id: e.id }, data: { 
batchId, txHash: receipt.hash }}); 
    } 
  }); 
 
  return { batchId, root, txHash: receipt.hash, count: 
unanchored.length }; 
} 
 
 
Contrato Solidity (anclaje) 
