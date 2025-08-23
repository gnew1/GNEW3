import type { NextApiRequest, NextApiResponse } from "next"; 
export default async function handler(req:NextApiRequest, 
res:NextApiResponse) { 
  const base = process.env.REPUTATION_API || "http://localhost:8088"; 
  const r = await fetch(`${base}/v1/appeal`, { method:"POST", 
headers:{ "content-type":"application/json" }, body: 
JSON.stringify(req.body) }); 
  const j = await r.json(); res.status(r.status).json(j); 
} 
 
 
