import crypto from "crypto"; 
import { ethers } from "ethers"; 
import ConsentAnchor from 
"../../../contracts/artifacts/ConsentAnchor.json"; 
export async function anchorBatch(eventHashes: string[]) { 
const root = merkleRoot(eventHashes.map(h => Buffer.from(h, 
"hex"))); 
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL); 
const wallet = new ethers.Wallet(process.env.ANCHOR_PK!, provider); 
const contract = new 
ethers.Contract(process.env.CONSENT_ANCHOR_ADDR!, ConsentAnchor.abi, 
wallet); 
const batchId = "ret_" + Date.now(); 
const tx = await contract.storeRoot("0x" + root.toString("hex"), 
batchId); 
const rec = await tx.wait(); 
return { batchId, txHash: rec.hash }; 
} 
function merkleRoot(layer: Buffer[]) { 
if (layer.length === 0) return Buffer.alloc(32, 0); 
while (layer.length > 1) { 
const next: Buffer[] = []; 
for (let i = 0; i < layer.length; i += 2) { 
const l = layer[i], r = layer[i+1] ?? l; 
next.push(crypto.createHash("sha256").update(Buffer.concat([l, 
r])).digest()); 
} 
layer = next; 
} 
return layer[0]; 
} 
Job de barrido (cron/polling) 
