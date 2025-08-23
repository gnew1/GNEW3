import { Router } from "express"; 
import { prisma } from "../infra/prisma"; 
import { reloadTemplates } from "../services/templates"; 
export const router = Router(); 
router.get("/", async (_req, res) => { 
const items = await prisma.legalTemplate.findMany({ include: { 
versions: true }}); 
res.json({ items }); 
}); 
router.post("/reload", async (_req, res) => { 
const count = await reloadTemplates(); 
res.status(202).json({ ok: true, count }); 
}); 
