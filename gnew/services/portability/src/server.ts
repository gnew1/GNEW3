import express from "express"; 
import rateLimit from "express-rate-limit"; 
import { makeReputationVC, signVCAsJWT } from "./vc/export_vc"; 
import { verifyJwtVC } from "./vc/import_vc"; 
import { execFile } from "child_process"; 
import { promisify } from "util"; 
 
const run = promisify(execFile); 
const app = express(); 
app.use(express.json({ limit: "1mb" })); 
app.use(rateLimit({ windowMs: 60_000, max: 120 })); 
 
app.post("/v1/export/vc", async (req, res) => { 
  try { 
    const { issuerDid, subjectDid, epoch, version, score, breakdown, 
merkleRoot, formulaHash, codeHash, artifactURI } = req.body; 
const vc = makeReputationVC({ issuerDid, subjectDid, epoch, 
version, score, breakdown, merkleRoot, formulaHash, codeHash, 
artifactURI }); 
const jwt = signVCAsJWT(vc, process.env.VC_ISSUER_PRIV!); 
res.json({ jwt }); 
} catch (e:any) { res.status(400).json({ error: e.message }); } 
}); 
app.post("/v1/import/vc", async (req, res) => { 
try { 
const out = await verifyJwtVC(req.body.jwt); 
res.json({ ok: true, normalized: out }); 
} catch (e:any) { res.status(400).json({ error: e.message }); } 
}); 
// EAS export via script (requires env for EAS addresses) 
app.post("/v1/export/eas", async (req, res) => { 
try { 
const { metaPath, leafPath, artifactURI } = req.body; 
const { stdout } = await run("node", 
["gnew/services/portability/src/eas/attest_score.js", metaPath, 
leafPath, artifactURI]); 
res.json({ ok: true, stdout }); 
} catch (e:any) { res.status(500).json({ error: e.message }); } 
}); 
const PORT = parseInt(process.env.PORT || "8087", 10); 
app.listen(PORT, ()=>console.log(`portability service :${PORT}`)); 
