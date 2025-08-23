import { prisma } from "../infra/prisma"; 
import crypto from "crypto"; 
import { ethers } from "ethers"; 
import ConsentAnchor from 
"../../../contracts/artifacts/ConsentAnchor.json"; 
function merkleRoot(hs: string[]): string { 
if (!hs.length) return "0x" + "0".repeat(64); 
let layer = hs.map(h=>Buffer.from(h,"hex")); 
  while (layer.length > 1) { 
    const next: Buffer[] = []; 
    for (let i=0;i<layer.length;i+=2){ 
      const l = layer[i], r = layer[i+1] ?? l; 
      
next.push(crypto.createHash("sha256").update(Buffer.concat([l,r])).dig
 est()); 
    } 
    layer = next; 
  } 
  return "0x" + layer[0].toString("hex"); 
} 
 
export async function anchorRecent() { 
  const decs = await prisma.jurisdictionDecision.findMany({ where: { 
batchId: null }, take: 2000 }); 
  if (!decs.length) return; 
  const root = merkleRoot(decs.map(d=>d.eventHash)); 
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL); 
  const wallet = new ethers.Wallet(process.env.ANCHOR_PK!, provider); 
  const contract = new 
ethers.Contract(process.env.CONSENT_ANCHOR_ADDR!, ConsentAnchor.abi, 
wallet); 
  const batchId = "jx_" + Date.now(); 
  const tx = await contract.storeRoot(root, batchId); 
  const rec = await tx.wait(); 
  await prisma.jurisdictionDecision.updateMany({ where: { id: { in: 
decs.map(x=>x.id) }}, data: { batchId, txHash: rec.hash }}); 
  return { batchId, txHash: rec.hash, count: decs.length }; 
} 
 
/apps/jurisdiction-svc/src/routes/admin.ts (opcional) 
// Endpoints de administración rápida: activar política y declarar 
cobertura 
import { Router } from "express"; 
import { prisma } from "../infra/prisma"; 
export const adminRouter = Router(); 
 
adminRouter.post("/policies/activate/:version", async (req,res)=>{ 
  const version = req.params.version; 
  await prisma.jurisdictionPolicy.updateMany({ data: { isActive: false 
}}); 
  await prisma.jurisdictionPolicy.upsert({ 
    where: { version }, 
    update: { isActive: true }, 
    create: { version, raw: {} } 
  }); 
  res.json({ ok: true, version }); 
}); 
 
adminRouter.post("/coverage", async (req,res)=>{ 
  const items = req.body.items as Array<{ code:string; status:string; 
notes?:string }>; 
  for (const it of items) { 
    await prisma.coverageCountry.upsert({ where: { code: it.code }, 
update: { status: it.status, notes: it.notes ?? null }, create: it as 
any }); 
  } 
  res.json({ ok: true }); 
}); 
 
