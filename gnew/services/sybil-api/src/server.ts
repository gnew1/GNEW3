import express from "express"; 
import rateLimit from "express-rate-limit"; 
import { readFileSync } from "fs"; 
import path from "path"; 
 
const app = express(); 
app.use(express.json({ limit: "512kb" })); 
app.use(rateLimit({ windowMs: 60_000, max: 120 })); 
 
// En producción, estos salen de storage/versionado por epoch 
const DATA_DIR = process.env.SYBIL_DATA_DIR || "/data/sybil"; 
const CURRENT_EPOCH = process.env.SYBIL_EPOCH || "20250819"; 
 
function loadRisk(user: string) { 
  const riskPath = path.join(DATA_DIR, CURRENT_EPOCH, "risk.json"); 
  const arr = JSON.parse(readFileSync(riskPath, "utf8")) as any[]; 
  const u = arr.find(x => x.user.toLowerCase() === 
user.toLowerCase()); 
  if (!u) throw new Error("user not found"); 
  return u; 
} 
 
app.get("/v1/risk/:address", (req, res) => { 
  try { 
    const u = loadRisk(req.params.address); 
    res.json({ user: u.user, risk: u.risk, signals: u.signals }); 
  } catch (e:any) { 
    res.status(404).json({ error: e.message }); 
  } 
}); 
 
// Devuelve prueba Merkle (leaf + path) para usar en SybilGate 
app.get("/v1/proof/:address", (req, res) => { 
  try { 
    const epoch = CURRENT_EPOCH; 
    const meta = JSON.parse(readFileSync(path.join(DATA_DIR, epoch, 
"meta.json"), "utf8")); 
    const leaves = JSON.parse(readFileSync(path.join(DATA_DIR, epoch, 
"leaves.json"), "utf8")); 
    const idx = leaves.findIndex((l:any)=> l.user.toLowerCase() === 
req.params.address.toLowerCase()); 
    if (idx<0) return res.status(404).json({ error: "no leaf" }); 
    // Para demo simple, incluimos leaf serializado y un path vacío 
(completa con merkle.build_proof) 
    const leaf = { user: leaves[idx].user, riskMilli: 
leaves[idx].score, version: leaves[idx].version }; 
    res.json({ epoch, leaf, proof: [], meta }); 
  } catch (e:any) { 
    res.status(500).json({ error: e.message }); 
  } 
}); 
const PORT = parseInt(process.env.PORT || "8083", 10); 
app.listen(PORT, ()=> console.log(`sybil-api on :${PORT}`)); 
