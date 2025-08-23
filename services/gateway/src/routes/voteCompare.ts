import { Router, Request, Response } from "express"; 
import { compareVariants, CompareRequest } from 
"../services/voteCompare"; 
 
export const voteCompareRouter = Router(); 
 
/** POST /governance/variants/compare 
 * Body: { options[], voters[], ballots[], variants?, qv_cost?, 
qv_credits_default?, perturbations?, perturb_strength? } 
 */ 
voteCompareRouter.post("/compare", (req: Request, res: Response) => { 
try { 
const payload = req.body as CompareRequest; 
const data = compareVariants(payload); 
res.setHeader("Cache-Control", "public, max-age=60"); 
res.status(200).json(data); 
} catch (e: any) { 
res.status(400).json({ error: e?.message ?? "Bad Request" }); 
} 
}); 
/services/gateway/src/app.ts (añade la ruta) 
import express from "express"; 
import cors from "cors"; 
import bodyParser from "body-parser"; 
import { voteCompareRouter } from "./routes/voteCompare"; 
// ...otros imports 
const app = express(); 
app.use(cors()); 
app.use(bodyParser.json({ limit: "1mb" })); 
// ... 
app.use("/governance/variants", voteCompareRouter); // <-- NUEVO 
export default app; 
/apps/web/app/api/vote-compare/route.ts (proxy Next.js App Router) 
import { NextRequest, NextResponse } from "next/server"; 
const GATEWAY_URL = process.env.GATEWAY_URL || 
"http://localhost:4000"; 
export async function POST(req: NextRequest) { 
const body = await req.json(); 
const r = await fetch(`${GATEWAY_URL}/governance/variants/compare`, 
{ 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify(body), 
    next: { revalidate: 60 }, 
  }); 
  const data = await r.text(); 
  return new NextResponse(data, { 
    status: r.status, 
    headers: { "Content-Type": r.headers.get("Content-Type") || 
"application/json" }, 
  }); 
} 
 
