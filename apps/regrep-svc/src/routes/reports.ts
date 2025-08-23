import { Router } from "express"; 
import { prisma } from "../infra/prisma"; 
import { z } from "zod"; 
import { materializeDefinitions, scheduleIfDue, processRun } from 
"../services/orchestrator"; 
export const router = Router(); 
// Estado de definiciones y última ejecución 
router.get("/definitions", async (_req, res) => { 
const defs = await prisma.reportDefinition.findMany({ orderBy: { 
key: "asc" }}); 
const runs = await prisma.reportRun.findMany({ orderBy: { createdAt: 
"desc" }, take: 100 }); 
res.json({ defs, runs }); 
}); 
// Forzar recarga del YAML → snapshot DB 
router.post("/definitions/reload", async (_req, res) => { 
const count = await materializeDefinitions(); 
res.status(202).json({ ok: true, count }); 
}); 
// Programar manualmente un periodo 
router.post("/runs/schedule", async (req, res) => { 
const Body = z.object({ 
key: z.string(), 
periodStart: z.string().datetime(), 
periodEnd: z.string().datetime() 
}); 
const b = Body.parse(req.body); 
const def = await prisma.reportDefinition.findFirst({ where: { key: 
b.key, active: true }}); 
if (!def) return res.status(404).json({ error: "DEF_NOT_FOUND" }); 
const run = await scheduleIfDue(def, new Date(b.periodStart), new 
Date(b.periodEnd), true); 
res.status(201).json(run); 
}); 
// Obtener detalle/artefactos/entregas 
router.get("/runs/:id", async (req, res) => { 
const run = await prisma.reportRun.findUnique({ where: { id: 
req.params.id }, 
include: { artifacts: true, deliveries: true, evidences: true, 
definition: true }}); 
if (!run) return res.status(404).end(); 
res.json(run); 
}); 
// Reintentar procesamiento de un run 
router.post("/runs/:id/retry", async (req, res) => { 
const r = await prisma.reportRun.findUnique({ where: { id: 
req.params.id }}); 
if (!r) return res.status(404).end(); 
await processRun(r.id); 
res.status(202).json({ ok: true }); 
}); 
