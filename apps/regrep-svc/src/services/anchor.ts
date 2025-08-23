import crypto from "crypto"; 
import { ethers } from "ethers"; 
import ConsentAnchor from 
"../../../contracts/artifacts/ConsentAnchor.json"; 
import { prisma } from "../infra/prisma"; 
export async function anchorBatch(hashes: string[], runId: string) { 
if (!hashes.length) return; 
// Merkle 
let layer = hashes.map(h=>Buffer.from(h, "hex")); 
while (layer.length > 1) { 
const next: Buffer[] = []; 
for (let i=0;i<layer.length;i+=2) { 
const l = layer[i], r = layer[i+1] ?? l; 
next.push(crypto.createHash("sha256").update(Buffer.concat([l,r])).dig
 est()); 
} 
layer = next; 
} 
const root = "0x" + layer[0].toString("hex"); 
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL); 
const wallet = new ethers.Wallet(process.env.ANCHOR_PK!, provider); 
const contract = new 
ethers.Contract(process.env.CONSENT_ANCHOR_ADDR!, ConsentAnchor.abi, 
wallet); 
const batchId = "rep_" + Date.now(); 
const tx = await contract.storeRoot(root, batchId); 
const receipt = await tx.wait(); 
await prisma.reportEvidence.create({ data: { runId, kind: 
"anchor_tx", content: { batchId, txHash: receipt.hash, root }}}); 
} 
