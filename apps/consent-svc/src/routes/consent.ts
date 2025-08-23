import { Router, Request, Response } from "express"; 
import { z } from "zod"; 
import { prisma } from "../infra/prisma"; 
import { normalizeDecisionInput, hashEvent, publishConsentEvent } from 
"../services/consent-core"; 
import { requireSubjectAuth } from "../infra/auth"; 
export const router = Router(); 
// GET /v1/consent/catalog 
router.get("/catalog", async (_req, res) => { 
const [purposes, dataCategories, uses, matrix] = await Promise.all([ 
prisma.purpose.findMany({ where: { isActive: true } }), 
prisma.dataCategory.findMany({ where: { isActive: true } }), 
    prisma.processingUse.findMany({ where: { isActive: true } }), 
    prisma.policyMatrix.findMany({ where: { isActive: true } }), 
  ]); 
  res.json({ purposes, dataCategories, uses, matrixVersion: 
(matrix[0]?.policyVersion ?? "v1") }); 
}); 
 
// GET /v1/consent/:subjectId 
router.get("/:subjectId", requireSubjectAuth, async (req, res) => { 
  const subjectId = req.params.subjectId; 
  const records = await prisma.consentRecord.findMany({ where: { 
subjectId } }); 
  res.json({ subjectId, records }); 
}); 
 
// POST /v1/consent/:subjectId/decisions 
router.post("/:subjectId/decisions", requireSubjectAuth, async (req: 
Request, res: Response) => { 
  const subjectId = req.params.subjectId; 
  const DecisionSchema = z.object({ 
    decisions: z.array(z.object({ 
      purposeKey: z.string(), 
      dataCategoryKey: z.string(), 
      processingUseKey: z.string(), 
      state: z.enum(["granted", "denied", "limited"]), 
      policyVersion: z.string(), 
      expiresAt: z.string().datetime().optional(), 
      provenance: z.enum(["ui_center", "ui_modal", "api", 
"import_gpc"]), 
      locale: z.string().optional() 
    })).min(1) 
  }); 
  const input = DecisionSchema.parse(req.body); 
  const normalized = await normalizeDecisionInput(subjectId, 
input.decisions); 
 
  const result = await prisma.$transaction(async (tx) => { 
    const writes = []; 
    for (const d of normalized) { 
      const rec = await tx.consentRecord.upsert({ 
        where: { 
          subjectId_purposeKey_dataCategoryKey_processingUseKey: { 
            subjectId, purposeKey: d.purposeKey, dataCategoryKey: 
d.dataCategoryKey, processingUseKey: d.processingUseKey 
          } 
        }, 
        update: { state: d.state, policyVersion: d.policyVersion, 
expiresAt: d.expiresAt ?? null }, 
        create: { subjectId, ...d } 
      }); 
      const eventPayload = { 
        kind: "consent.decision.created", 
        subjectId, 
        recordId: rec.id, 
        decision: d, 
        at: new Date().toISOString() 
      }; 
      const eventHash = hashEvent(eventPayload); 
      await tx.consentEvent.create({ 
        data: { subjectId, recordId: rec.id, payload: eventPayload, 
eventHash, prevHash: d.prevHash ?? null } 
      }); 
      writes.push({ rec, eventHash }); 
    } 
    return writes; 
  }); 
 
  // Emitir eventos asíncronos (no bloquear la respuesta) 
  publishConsentEvent(result.map(r => ({ type: 
"consent.decision.created", hash: r.eventHash }))) 
    .catch(() => {/* logging interno */}); 
 
  return res.status(202).json({ ok: true, count: result.length }); 
}); 
 
// POST /v1/consent/signals/gpc 
router.post("/signals/gpc", async (req, res) => { 
  const GpcSchema = z.object({ 
    subjectId: z.string().optional(), // puede venir anónimo (visitor) 
    userAgent: z.string(), 
    proof: z.object({ gpc: z.boolean() }) 
  }); 
  const body = GpcSchema.parse(req.body); 
  const record = await prisma.gPCSignal.create({ data: { 
    subjectId: body.subjectId ?? null, userAgent: body.userAgent, 
honored: body.proof.gpc, meta: body.proof 
  }}); 
  res.status(201).json({ id: record.id }); 
}); 
 
// POST /v1/consent/:subjectId/withdraw 
router.post("/:subjectId/withdraw", requireSubjectAuth, async (req, 
res) => { 
  const subjectId = req.params.subjectId; 
  const now = new Date(); 
  const records = await prisma.consentRecord.findMany({ where: { 
subjectId }}); 
  if (records.length === 0) return res.status(204).send(); 
 
  await prisma.$transaction(async (tx) => { 
    for (const r of records) { 
      if (r.processingUseKey === "strictly_necessary") continue; 
      await tx.consentRecord.update({ where: { id: r.id }, data: { 
state: "withdrawn", expiresAt: now }}); 
      const eventPayload = { kind: "consent.decision.withdrawn", 
subjectId, recordId: r.id, at: now.toISOString() }; 
      const eventHash = hashEvent(eventPayload); 
      await tx.consentEvent.create({ data: { subjectId, recordId: 
r.id, payload: eventPayload, eventHash, prevHash: r.prevHash ?? null 
}}); 
    } 
  }); 
 
  res.status(202).json({ ok: true }); 
}); 
// GET /v1/consent/:subjectId/audit 
router.get("/:subjectId/audit", requireSubjectAuth, async (req, res) 
=> { 
const subjectId = req.params.subjectId; 
const events = await prisma.consentEvent.findMany({ where: { 
subjectId }, orderBy: { createdAt: "desc" }, take: 200 }); 
res.json({ subjectId, events }); 
}); 
