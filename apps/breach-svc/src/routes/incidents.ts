import { Router } from "express"; 
import { z } from "zod"; 
import { prisma } from "../infra/prisma"; 
import { createIncident, assessIncident, buildSchedule, closeIncident 
} from "../services/incidents"; 
import { addTimeline } from "../services/timeline"; 
export const router = Router(); 
router.get("/", async (_req, res) => { 
const rows = await prisma.incident.findMany({ orderBy: { createdAt: 
"desc" }, include: { checklist: true, tasks: true, timeline: true }}); 
res.json(rows); 
}); 
router.post("/", async (req, res) => { 
const Body = z.object({ 
discoveredAt: z.string().datetime(), 
detectedBy: z.string().optional(), 
summary: z.string(), 
description: z.string().optional().default(""), 
vector: z.string().optional(), 
jurisdictions: z.array(z.string()).nonempty(), 
initialCategories: z.array(z.object({ 
dataCategory: z.string(), approximateCount: 
z.number().int().optional(), 
      encryptedAtRest: z.boolean().optional().default(false), 
encryptedInUse: z.boolean().optional().default(false), hashedOnly: 
z.boolean().optional().default(false) 
    })).optional().default([]) 
  }); 
  const inc = await createIncident(Body.parse(req.body)); 
  res.status(201).json(inc); 
}); 
 
router.post("/:id/assess", async (req, res) => { 
  const Body = z.object({ 
    severity: z.enum(["S0","S1","S2","S3"]), 
    riskScore: z.number().min(0).max(1), 
    dataSubjects: z.number().int().optional(), 
    categories: z.array(z.object({ 
      dataCategory: z.string(), highRisk: z.boolean().optional(), 
      approximateCount: z.number().int().optional(), 
      encryptedAtRest: z.boolean().optional(), encryptedInUse: 
z.boolean().optional(), hashedOnly: z.boolean().optional() 
    })).optional().default([]) 
  }); 
  const out = await assessIncident(req.params.id, 
Body.parse(req.body)); 
  res.json(out); 
}); 
 
router.post("/:id/schedule", async (req, res) => { 
  const out = await buildSchedule(req.params.id); 
  res.json(out); 
}); 
 
router.post("/:id/close", async (req, res) => { 
  const out = await closeIncident(req.params.id, req.body?.reason ?? 
"resolved"); 
  res.json(out); 
}); 
 
router.get("/:id", async (req, res) => { 
const row = await prisma.incident.findUnique({ where: { id: 
req.params.id }, include: { checklist: true, tasks: true, timeline: 
true, categories: true, stakeholders: true }}); 
if (!row) return res.status(404).end(); 
res.json(row); 
}); 
