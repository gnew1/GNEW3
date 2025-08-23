import express from "express"; 
import rateLimit from "express-rate-limit"; 
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 
"fs"; 
import path from "path"; 
import crypto from "crypto"; 
import { ethers } from "ethers"; 
const app = express(); 
app.use(express.json({ limit: "1mb" })); 
app.use(rateLimit({ windowMs: 60_000, max: 120 })); 
// Config 
const DATA_DIR = process.env.REP_DATA_DIR || "/data/reputation"; 
const REGISTRY = process.env.REPUTATION_REGISTRY || 
"0xReputationRootRegistry"; 
const RPC = process.env.GNEW_RPC_URL || ""; 
const provider = RPC ? new ethers.JsonRpcProvider(RPC) : null; 
const REG_ABI = [ 
"function getRoot(uint64 epoch) view returns (tuple(bytes32 
merkleRoot, bytes32 formulaHash, bytes32 codeHash, string ipfsURI, 
uint64 updatedAt, uint32 version))" 
]; 
// Helpers 
function loadScores(epoch: string) { 
const p = path.join(DATA_DIR, epoch, "scores.jsonl"); 
const meta = JSON.parse(readFileSync(path.join(DATA_DIR, epoch, 
"meta.json"), "utf8")); 
const lines = readFileSync(p, 
"utf8").trim().split("\n").map(l=>JSON.parse(l)); 
return { meta, lines }; 
} 
// --- API: Mi score + breakdown 
app.get("/v1/me", (req, res) => { 
const address = String(req.query.address||"").toLowerCase(); 
const epoch = String(req.query.epoch||"latest"); 
  try { 
    const ep = epoch === "latest" ? getLatestEpoch() : epoch; 
    const { meta, lines } = loadScores(ep); 
    const row = lines.find((x:any)=> x.user.toLowerCase() === 
address); 
    if (!row) return res.status(404).json({ error: "user not found" 
}); 
 
    // Proof dummy (opcional: generar Merkle proof con 
services.reputation.merkle) 
    const proof = { leaf: { user: row.user, scoreMilli: 
Math.round(row.score*1000), version: meta.version }, merkleRoot: 
meta.merkleRoot, proof: [] }; 
    const band = percentileBand(lines.map((x:any)=>x.score), 
row.score); 
 
    res.json({ 
      address, epoch: Number(ep), version: meta.version, score: 
Math.round(row.score), 
      band, items: row.items.map((i:any)=>({ kind:i.kind, ts:i.ts, 
val:i.val, contrib:i.contrib, mult:i.mult })), 
      proof 
    }); 
  } catch (e:any) { 
    res.status(500).json({ error: e.message }); 
  } 
}); 
 
// --- API: Verificar (leaf + proof vs root on-chain) 
app.post("/v1/verify", async (req, res) => { 
  try { 
    const { leaf, merkleRoot } = req.body || {}; 
    if (!provider) throw new Error("RPC not configured"); 
    const reg = new ethers.Contract(REGISTRY, REG_ABI, provider); 
    const epoch = Number(req.body.epoch || getLatestEpoch()); 
    const rootMeta = await reg.getRoot(epoch); 
    const root = rootMeta[0]; 
    const ok = root && root.toLowerCase() === 
String(merkleRoot).toLowerCase(); 
    res.json({ ok: Boolean(ok) }); 
  } catch (e:any) { 
    res.status(500).json({ error: e.message }); 
  } 
}); 
 
// --- API: Appeal 
app.post("/v1/appeal", (req, res) => { 
  try { 
    const { address, epoch, version, category, description, 
attachmentUrl } = req.body; 
    const id = crypto.randomUUID(); 
    const dir = path.join(DATA_DIR, "appeals"); 
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); 
    writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ 
      id, address: String(address).toLowerCase(), epoch, version, 
category, description, attachmentUrl, 
      status: "received", createdAt: new Date().toISOString(), 
updates: [] 
    }, null, 2)); 
    res.json({ ok:true, id }); 
  } catch (e:any) { 
    res.status(400).json({ error: e.message }); 
  } 
}); 
 
app.get("/v1/appeal/:id", (req, res) => { 
  try { 
    const p = path.join(DATA_DIR, "appeals", `${req.params.id}.json`); 
    if (!existsSync(p)) return res.status(404).json({ error: "not 
found" }); 
    res.json(JSON.parse(readFileSync(p,"utf8"))); 
  } catch (e:any) { res.status(500).json({ error: e.message }); } 
}); 
 
// utilidades 
function getLatestEpoch(): string { 
// Convención: subcarpetas YYYYMMDD. En producción: cache/DB. 
return process.env.REP_EPOCH || "20250819"; 
} 
function percentileBand(arr:number[], val:number){ 
const sorted = [...arr].sort((a,b)=>a-b); 
const idx = sorted.findIndex(x=>x>=val); 
const p = Math.round(100 * idx / Math.max(1,sorted.length-1)); 
if (p < 50) return "P40–P50"; 
if (p < 60) return "P50–P60"; 
if (p < 70) return "P60–P70"; 
if (p < 80) return "P70–P80"; 
if (p < 90) return "P80–P90"; 
return "P90+"; 
} 
const PORT = parseInt(process.env.PORT || "8088", 10); 
app.listen(PORT, ()=>console.log(`reputation-api :${PORT}`)); 
