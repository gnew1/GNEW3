import crypto from "crypto"; 
import { ethers } from "ethers"; 
import ConsentAnchor from 
"../../../contracts/artifacts/ConsentAnchor.json"; 
 
export async function anchorBatch(hashes: string[]) { 
  if (!hashes.length) return { batchId: null, txHash: null }; 
  let layer = hashes.map(h=>Buffer.from(h,"hex")); 
  while (layer.length>1){ 
    const next:Buffer[]=[]; for(let i=0;i<layer.length;i+=2){ 
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
  const batchId = "sig_" + Date.now(); 
  const tx = await contract.storeRoot(root, batchId); 
  const rec = await tx.wait(); 
  return { batchId, txHash: rec.hash }; 
} 
 
