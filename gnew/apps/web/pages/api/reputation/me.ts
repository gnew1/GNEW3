// Next.js API route proxy -> reputation-api 
import type { NextApiRequest, NextApiResponse } from "next"; 
export default async function handler(req:NextApiRequest, 
res:NextApiResponse) { 
const { address } = req.query; 
const base = process.env.REPUTATION_API || "http://localhost:8088"; 
const r = await fetch(`${base}/v1/me?address=${address}`); 
const j = await r.json(); 
res.status(r.status).json(j); 
} 
