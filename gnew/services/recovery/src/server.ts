import express from "express"; 
import { ethers } from "ethers"; 
import rateLimit from "express-rate-limit"; 
const app = express(); 
app.use(express.json({ limit: "512kb" })); 
app.use(rateLimit({ windowMs: 60_000, max: 120 })); 
const RPC = process.env.GNEW_RPC_URL!; 
const provider = new ethers.JsonRpcProvider(RPC); 
const RECOVERY_ABI = [ 
"function proposeOnchain(address newOwner,string evidenceURI) 
returns (uint256)", 
"function approveOnchain(uint256 nonce)", 
"function proposeWithSignatures(address newOwner,address[] 
signers,bytes[] sigs,string evidenceURI) returns (uint256)", 
"function finalize(uint256 nonce)", 
"function cancel(uint256 nonce,address[] signers,bytes[] sigs,string 
reason)", 
"function getRecovery(uint256 nonce) view returns 
(address,uint64,uint64,uint64,uint32,bool)", 
"function DOMAIN_SEPARATOR() view returns (bytes32)", // EIP712 from 
OZ inside EIP712 base 
]; 
function typedData(chainId: number, verifyingContract: string, nonce: 
bigint, proposed: string, guardian: string) { 
return { 
domain: { name: "GNEW Social Recovery", version: "1", chainId, 
verifyingContract }, 
types: { ApproveRecovery: [{ name:"nonce", type:"uint256" },{ 
name:"proposed", type:"address" },{ name:"guardian", type:"address" 
}]}, 
primaryType: "ApproveRecovery" as const, 
message: { nonce, proposed, guardian } 
}; 
} 
// --- Endpoints --- 
app.post("/v1/recovery/typed", async (req, res) => { 
const { verifyingContract, proposed, guardian } = req.body; 
const net = await provider.getNetwork(); 
// el nonce esperado es "próximo" (recoveryNonce+1) → pásalo desde 
el front o consúltalo vía JSON-RPC 
const nextNonce = BigInt(req.body.nextNonce);  
res.json(typedData(Number(net.chainId), verifyingContract, 
nextNonce, proposed, guardian)); 
}); 
app.post("/v1/recovery/proposeBatch", async (req, res) => { 
const { verifyingContract, signerKey, proposed, signers, sigs, 
evidenceURI } = req.body; 
const wallet = new ethers.Wallet(signerKey, provider); 
const c = new ethers.Contract(verifyingContract, RECOVERY_ABI, 
wallet); 
const tx = await c.proposeWithSignatures(proposed, signers, sigs, 
evidenceURI || ""); 
const rc = await tx.wait(); 
res.json({ tx: tx.hash, nonce: Number(rc?.logs?.[0]?.args?.nonce || 
0) }); 
}); 
app.post("/v1/recovery/finalize", async (req, res) => { 
const { verifyingContract, signerKey, nonce } = req.body; 
const wallet = new ethers.Wallet(signerKey, provider); 
const c = new ethers.Contract(verifyingContract, RECOVERY_ABI, 
wallet); 
const tx = await c.finalize(nonce); 
await tx.wait(); 
res.json({ tx: tx.hash }); 
}); 
app.post("/v1/recovery/cancel", async (req, res) => { 
const { verifyingContract, signerKey, nonce, signers = [], sigs = 
[], reason = "" } = req.body; 
const wallet = new ethers.Wallet(signerKey, provider); 
const c = new ethers.Contract(verifyingContract, RECOVERY_ABI, 
wallet); 
const tx = await c.cancel(nonce, signers, sigs, reason); 
await tx.wait(); 
res.json({ tx: tx.hash }); 
}); 
const PORT = parseInt(process.env.PORT || "8086", 10); 
app.listen(PORT, ()=>console.log(`recovery service :${PORT}`)); 
