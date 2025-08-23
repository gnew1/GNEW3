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
    for (let i=0;i<layer.length;i+=2) { 
      const l = layer[i], r = layer[i+1] ?? l; 
      
next.push(crypto.createHash("sha256").update(Buffer.concat([l,r])).dig
 est()); 
    } 
    layer = next; 
  } 
  return "0x" + layer[0].toString("hex"); 
} 
 
export async function anchorRecent() { 
  const pending = await prisma.screeningRun.findMany({ where: { 
batchId: null }, take: 2000 }); 
  if (!pending.length) return; 
  const root = merkleRoot(pending.map(p => p.eventHash)); 
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL); 
  const wallet = new ethers.Wallet(process.env.ANCHOR_PK!, provider); 
  const contract = new 
ethers.Contract(process.env.CONSENT_ANCHOR_ADDR!, ConsentAnchor.abi, 
wallet); 
  const batchId = "scr_" + Date.now(); 
  const tx = await contract.storeRoot(root, batchId); 
  const rec = await tx.wait(); 
  await prisma.screeningRun.updateMany({ where: { id: { in: 
pending.map(p => p.id) }}, data: { batchId, txHash: rec.hash }}); 
  return { batchId, txHash: rec.hash, count: pending.length }; 
} 
 
Worker simple 
