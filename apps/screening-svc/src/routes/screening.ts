import { Router } from "express"; 
import { z } from "zod"; 
import { screen } from "../services/engine"; 
import { prisma } from "../infra/prisma"; 
export const router = Router(); 
router.post("/check", async (req, res) => { 
const Body = z.object({ 
subjectId: z.string(), 
name: z.string().optional(), 
country: z.string().optional(), 
dob: z.string().optional(), 
docs: z.array(z.string()).optional(), 
wallets: z.array(z.string()).optional() 
}); 
const b = Body.parse(req.body); 
const run = await screen(b); 
res.json({ decision: run.decision, runId: run.id }); 
}); 
router.get("/subjects/:subjectId", async (req, res) => { 
const subj = await prisma.subject.findUnique({ where: { subjectId: 
req.params.subjectId }}); 
res.json(subj ?? { subjectId: req.params.subjectId, status: 
"unknown" }); 
}); 
router.get("/hits/:runId", async (req, res) => { 
const r = await prisma.screeningRun.findUnique({ where: { id: 
req.params.runId }}); 
if (!r) return res.status(404).end(); 
res.json({ input: r.input, decision: r.decision, evidence: 
r.evidence, eventHash: r.eventHash, txHash: r.txHash, batchId: 
r.batchId }); 
}); 
router.post("/allowlist", async (req, res) => { 
const b = z.object({ 
subjectId: z.string(), sourceKey: z.string().optional(), itemId: 
z.string().optional(), 
reason: z.string(), expiresAt: z.string() 
}).parse(req.body); 
const item = await prisma.allowlist.create({ data: { ...b, 
expiresAt: new Date(b.expiresAt) }}); 
res.status(201).json({ id: item.id }); 
}); 
