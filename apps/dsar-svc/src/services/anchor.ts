import { ethers } from "ethers"; 
import crypto from "crypto"; 
import fs from "fs/promises"; 
import ConsentAnchor from 
"../../../contracts/artifacts/ConsentAnchor.json"; 
import { prisma } from "../infra/prisma"; 
export async function anchorBatch(requestId: string) { 
// Anclamos hash del certificado si existe 
const art = await prisma.dSARArtifact.findFirst({ where: { 
requestId, name: "erasure-certificate.json" }}); 
if (!art) return; 
const buf = await fs.readFile(art.path); 
const root = "0x" + 
crypto.createHash("sha256").update(buf).digest("hex"); 
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL); 
const wallet = new ethers.Wallet(process.env.ANCHOR_PK!, provider); 
const contract = new 
ethers.Contract(process.env.CONSENT_ANCHOR_ADDR!, ConsentAnchor.abi, 
wallet); 
const batchId = `dsar_${requestId}`; 
const tx = await contract.storeRoot(root, batchId); 
const receipt = await tx.wait(); 
// Guardar como evidencia 
await prisma.dSAREvidence.create({ data: { requestId, kind: 
"anchor_tx", content: { txHash: receipt.hash, batchId, root }}}); 
} 
Worker (cola simple por polling) 
