import express from "express"; 
import { randomBytes } from "crypto"; 
import { ethers } from "ethers"; 
import rateLimit from "express-rate-limit"; 
import Redis from "ioredis"; 
// ENV 
const PORT = parseInt(process.env.PORT || "8080", 10); 
const PRIVATE_KEY = process.env.SPONSOR_PRIVATE_KEY!; // clave 
rotativa (Vault) 
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"; 
const redis = new Redis(REDIS_URL); 
const app = express(); 
app.use(express.json({ limit: "256kb" })); 
 
// Límite básico por IP (off-chain). On-chain: quotas por address. 
app.use(rateLimit({ windowMs: 60_000, max: 120 })); 
 
// Políticas en DB (simplificado en memoria) 
type Policy = { 
  id: number; 
  name: string; 
  chains: number[]; 
  allow: { to: string; selector: string; maxValueWei: string; 
maxGasLimit: number }[]; 
  perUserDailyTxCap: number; 
}; 
 
const policies: Policy[] = [ 
  { 
    id: 1, 
    name: "v1-critical", 
    chains: [8453, 42161, 137], 
    allow: [ 
      { to: "0xVotingContract...", selector: "0x12345678", 
maxValueWei: "0", maxGasLimit: 600000 }, 
      { to: "0xRewards...", selector: "0xabcdef01", maxValueWei: 
ethers.parseEther("0.02").toString(), maxGasLimit: 500000 }, 
    ], 
    perUserDailyTxCap: 10 
  } 
]; 
 
function findRule(policy: Policy, to: string, selector: string) { 
  return policy.allow.find(a => a.to.toLowerCase() === 
to.toLowerCase() && a.selector === selector); 
} 
 
const wallet = new ethers.Wallet(PRIVATE_KEY); 
 
// API: solicitar ticket 
app.post("/ticket", async (req, res) => { 
  try { 
    const { user, to, selector, chainId, policyId } = req.body as { 
      user: string; to: string; selector: string; chainId: number; 
policyId: number; 
    }; 
 
    // Validaciones mínimas 
    if (!ethers.isAddress(user) || !ethers.isAddress(to)) return 
res.status(400).json({ error: "bad address" }); 
 
    const policy = policies.find(p => p.id === policyId); 
    if (!policy || !policy.chains.includes(chainId)) return 
res.status(403).json({ error: "policy not allowed" }); 
 
    const rule = findRule(policy, to, selector); 
    if (!rule) return res.status(403).json({ error: "method not 
allowed" }); 
 
    // Cuota diaria por usuario 
    const todayKey = `quota:${policy.id}:${chainId}:${user}:${new 
Date().toISOString().slice(0,10)}`; 
    const used = parseInt((await redis.get(todayKey)) || "0", 10); 
    if (used >= policy.perUserDailyTxCap) return 
res.status(429).json({ error: "daily cap reached" }); 
 
    const now = Math.floor(Date.now()/1000); 
    const ticket = { 
      user, to, selector, 
      maxValueWei: rule.maxValueWei, 
      maxGasLimit: rule.maxGasLimit, 
      nonce: Number(BigInt.asUintN(64, 
BigInt("0x"+randomBytes(8).toString("hex")))), 
      validUntil: now + 300,  // 5 minutos 
      validAfter: now - 5, 
      policyId: policy.id, 
      chainId 
    }; 
 
    // Hash y firma 
    const abi = new ethers.AbiCoder(); 
    const encoded = abi.encode( 
      
["bytes32","address","address","bytes4","uint256","uint256","uint256",
 "uint48","uint48","uint256","uint256"], 
      ["0x" + Buffer.from("GNEW_SPONSOR_TICKET").toString("hex"), 
       ticket.user, ticket.to, ticket.selector, 
       ticket.maxValueWei, ticket.maxGasLimit, 
       ticket.nonce, ticket.validUntil, ticket.validAfter, 
ticket.policyId, ticket.chainId 
      ] 
    ); 
    const hash = ethers.keccak256(encoded); 
    const sig = await wallet.signMessage(ethers.getBytes(hash)); 
 
    // Reserva cuota (soft) 
    await redis.set(todayKey, String(used + 1), "EX", 24*3600); 
 
    res.json({ ticket, sig, signer: await wallet.getAddress() }); 
  } catch (e:any) { 
    res.status(500).json({ error: e.message }); 
  } 
}); 
 
// Salud/metrics hooks (añadir Prometheus middleware real) 
app.get("/healthz", (_, res) => res.send("ok")); 
 
app.listen(PORT, () => { 
  console.log(`sponsor listening on :${PORT}`); 
}); 
 
 
5.3 SDK cliente (TypeScript) 
