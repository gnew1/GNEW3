import { Router } from "express"; 
import { z } from "zod"; 
import { prisma } from "../infra/prisma"; 
import { requireSubjectAuth, requireAdmin } from "../infra/auth"; 
import { enqueueTasksFor } from "../services/orchestrator"; 
import { computeDueAt } from "../services/sla"; 
 
export const router = Router(); 
 
// GET list (admin console) 
router.get("/requests", requireAdmin, async (req, res) => { 
  const status = req.query.status as string | undefined; 
  const where = status ? { status } : {}; 
  const items = await prisma.dSARRequest.findMany({ where, orderBy: { 
createdAt: "desc" }, take: 100 }); 
  res.json({ items }); 
}); 
 
// POST create (subject/self-serve portal o soporte) 
router.post("/requests", requireSubjectAuth, async (req, res) => { 
  const Body = z.object({ 
    subjectId: z.string(), 
    type: z.enum(["access","erasure"]), 
    region: z.string(), 
    scope: z.any().optional() 
  }); 
  const body = Body.parse(req.body); 
  const dueAt = computeDueAt(body.region); 
  const r = await prisma.dSARRequest.create({ 
    data: { ...body, status: "received", dueAt, slaAckAt: new Date() } 
  }); 
  res.status(202).json({ id: r.id }); 
}); 
 
// GET detail 
router.get("/requests/:id", requireAdmin, async (req, res) => { 
  const id = req.params.id; 
  const r = await prisma.dSARRequest.findUnique({ where: { id }, 
include: { tasks: true, evidences: true, artifacts: true }}); 
  if (!r) return res.status(404).end(); 
  res.json(r); 
}); 
// POST verify identity evidence (admin o flujo automático) 
router.post("/requests/:id/verify", requireAdmin, async (req, res) => 
{ 
const id = req.params.id; 
await prisma.dSARRequest.update({ where: { id }, data: { status: 
"verified" }}); 
res.status(204).end(); 
}); 
// POST approve (inicia orquestación) 
router.post("/requests/:id/approve", requireAdmin, async (req,res)=>{ 
const id = req.params.id; 
const reqDSAR = await prisma.dSARRequest.update({ where: { id }, 
data: { status: "approved" }}); 
await enqueueTasksFor(reqDSAR); 
res.status(202).json({ ok: true }); 
}); 
// POST export (puede reintentar) 
router.post("/requests/:id/export", requireAdmin, async (req,res)=>{ 
await prisma.dSARTask.create({ data: { requestId: req.params.id, 
connector: "orchestrator", op: "export", status:"pending" }}); 
res.status(202).json({ ok: true }); 
}); 
// POST erase (borrado/anonimización) 
router.post("/requests/:id/erase", requireAdmin, async (req,res)=>{ 
await prisma.dSARTask.create({ data: { requestId: req.params.id, 
connector: "orchestrator", op: "erasure", status:"pending" }}); 
res.status(202).json({ ok: true }); 
}); 
// GET artifacts 
router.get("/requests/:id/artifacts", requireAdmin, async (req,res)=>{ 
const items = await prisma.dSARArtifact.findMany({ where: { 
requestId: req.params.id }}); 
res.json({ items }); 
}); 
