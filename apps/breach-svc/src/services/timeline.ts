import { prisma } from "../infra/prisma"; 
import crypto from "crypto"; 
import { ethers } from "ethers"; 
import ConsentAnchor from 
"../../../contracts/artifacts/ConsentAnchor.json"; 
export async function addTimeline(incidentId: string, input: { 
type:string; note:string; actor?:string }) { 
  const prev = await prisma.timelineEntry.findFirst({ where: { 
incidentId }, orderBy: { at: "desc" }}); 
  const payload = { incidentId, ...input, at: new Date().toISOString() 
}; 
  const eventHash = 
crypto.createHash("sha256").update(JSON.stringify(payload)).digest("he
 x"); 
  return prisma.timelineEntry.create({ data: { incidentId, type: 
input.type, note: input.note, actor: input.actor ?? null, prevHash: 
prev?.eventHash ?? null, eventHash }}); 
} 
 
export async function anchorRecent(incidentId: string) { 
  const pending = await prisma.timelineEntry.findMany({ where: { 
incidentId, txHash: null }, orderBy: { at: "asc" }}); 
  if (!pending.length) return null; 
  // Merkle 
  let layer = pending.map(p => Buffer.from(p.eventHash, "hex")); 
  while (layer.length > 1) { 
    const next:Buffer[] = []; 
    for (let i=0;i<layer.length;i+=2){ 
      const l = layer[i], r = layer[i+1] ?? l; 
      
next.push(require("crypto").createHash("sha256").update(Buffer.concat(
 [l,r])).digest()); 
    } 
    layer = next; 
  } 
  const root = "0x" + layer[0].toString("hex"); 
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL); 
  const wallet = new ethers.Wallet(process.env.ANCHOR_PK!, provider); 
  const contract = new 
ethers.Contract(process.env.CONSENT_ANCHOR_ADDR!, ConsentAnchor.abi, 
wallet); 
  const batchId = "brc_" + Date.now(); 
  const tx = await contract.storeRoot(root, batchId); 
  const rec = await tx.wait(); 
  await prisma.timelineEntry.updateMany({ where: { id: { in: 
pending.map(p => p.id) }}, data: { batchId, txHash: rec.hash }}); 
  return { batchId, txHash: rec.hash }; 
} 
 
