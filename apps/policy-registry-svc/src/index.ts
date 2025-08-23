import express from "express"; 
import path from "path"; 
const app = express(); 
const root = process.env.BUNDLES_DIR || path.join(process.cwd(), 
"bundles"); 
app.use("/bundles", express.static(root, { fallthrough: false })); 
app.get("/healthz", (_req,res)=>res.json({ok:true})); 
app.listen(process.env.PORT || 8089, 
()=>console.log("policy-registry-svc up")); 
 
 
CI/CD — Tests, Bundle & Versionado 
