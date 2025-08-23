import { Router } from "express"; 
import { z } from "zod"; 
import { prisma } from "../infra/prisma"; 
import { resolvePolicyFor } from "../services/engine"; 
 
export const router = Router(); 
 
// Registrar o actualizar un RetentionTag (SDK/servicios productores 
lo llaman al crear datos) 
router.post("/", async (req, res) => { 
  const Body = z.object({ 
    subjectId: z.string().optional(), 
    system: z.string(), 
    resourceType: z.string(), 
    resourceId: z.string(), 
    dataCategory: z.string(), 
    purpose: z.string(), 
    baseLegal: z.string(), 
    region: z.string().optional() 
  }); 
  const b = Body.parse(req.body); 
  const pol = await resolvePolicyFor(b); 
  const expireAt = new Date(Date.now() + pol.ttlDays*24*60*60*1000); 
  const tag = await prisma.retentionTag.upsert({ 
    where: { system_resourceType_resourceId_dataCategory_purpose: { 
      system: b.system, resourceType: b.resourceType, resourceId: 
b.resourceId, dataCategory: b.dataCategory, purpose: b.purpose 
    } as any }, 
    update: { subjectId: b.subjectId ?? null, baseLegal: b.baseLegal, 
region: b.region ?? null, policyVersion: pol.version, expireAt }, 
    create: { ...b, policyVersion: pol.version, expireAt } 
  }); 
  res.status(201).json({ id: tag.id, expireAt, policyVersion: 
pol.version }); 
}); 
 
// Acelerar vencimiento por withdraw (ej. desde consent-svc) 
router.post("/accelerate", async (req, res) => { 
  const Body = z.object({ 
    subjectId: z.string(), 
    purpose: z.string() 
  }); 
  const b = Body.parse(req.body); 
  const now = new Date(); 
  await prisma.retentionTag.updateMany({ 
    where: { subjectId: b.subjectId, purpose: b.purpose, expireAt: { 
gt: now }}, 
    data: { expireAt: now } 
  }); 
  res.status(202).json({ ok: true }); 
}); 
 
// Consultar próximas expiraciones 
router.get("/due", async (_req, res) => { 
  const items = await prisma.retentionTag.findMany({ where: { 
expireAt: { lte: new Date() }, legalHold: false }, take: 2000 }); 
  res.json({ items }); 
}); 
 
