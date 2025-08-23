import { Router } from "express"; 
import { prisma } from "../infra/prisma"; 
import { loadPolicyFile, materializePolicies } from 
"../services/policies"; 
import { requireAdmin } from "../infra/auth"; 
export const router = Router(); 
router.get("/", requireAdmin, async (_req, res) => { 
  const items = await prisma.retentionPolicy.findMany({ where: { 
isActive: true }}); 
  res.json({ items }); 
}); 
 
router.post("/reload", requireAdmin, async (_req, res) => { 
  const doc = await loadPolicyFile(); 
  const count = await materializePolicies(doc); 
  res.status(202).json({ ok: true, count }); 
}); 
 
