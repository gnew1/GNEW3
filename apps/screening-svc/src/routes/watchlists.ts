import { Router } from "express"; 
import { prisma } from "../infra/prisma"; 
import { refreshAll } from "../services/watchlists"; 
export const router = Router(); 
router.get("/status", async (_req, res) => { 
const sources = await prisma.watchlistSource.findMany({ orderBy: { 
key: "asc" }}); 
res.json({ sources }); 
}); 
router.post("/refresh", async (_req, res) => { 
refreshAll().catch(()=>{}); 
res.status(202).json({ ok: true }); 
}); 
