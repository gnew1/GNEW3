import { Router } from "express"; 
import { z } from "zod"; 
import { prisma } from "../infra/prisma"; 
import { createEnvelope, renderEnvelopePDF, sendEnvelope, signerLink, 
applySignature, voidEnvelope } from "../services/envelopes"; 
 
export const router = Router(); 
 
router.post("/", async (req, res) => { 
  const Body = z.object({ 
    templateKey: z.string(), 
    locale: z.string().default("es-ES"), 
    data: z.record(z.any()), 
    createdBy: z.string(), 
    signers: z.array(z.object({ 
      role: z.string(), name: z.string(), 
      email: z.string().email().optional(), 
      subjectId: z.string().optional(), order: 
z.number().int().default(1) 
    })).min(1) 
  }); 
  const env = await createEnvelope(Body.parse(req.body)); 
  res.status(201).json(env); 
}); 
 
router.post("/:id/render", async (req, res) => { 
  const out = await renderEnvelopePDF(req.params.id); 
  res.json(out); 
}); 
 
router.post("/:id/send", async (req, res) => { 
  const r = await sendEnvelope(req.params.id); 
  res.status(202).json(r); 
}); 
 
router.get("/:id/signers/:signerId/link", async (req, res) => { 
  const url = await signerLink(req.params.id, req.params.signerId); 
  res.json({ url }); 
}); 
router.post("/:id/void", async (req, res) => { 
await voidEnvelope(req.params.id, req.body?.reason ?? 
"voided_by_admin"); 
res.json({ ok: true }); 
}); 
// Endpoint usado por la página de firma (callback JSON) 
router.post("/sign/:token", async (req, res) => { 
const { ip, headers } = req; 
const ua = headers["user-agent"] || ""; 
const r = await applySignature(req.params.token, { 
ip: (ip as any) || "", userAgent: String(ua), 
signatureImg: req.body?.signatureImg || null 
}); 
res.json(r); 
}); 
router.get("/:id", async (req, res) => { 
const env = await prisma.envelope.findUnique({ 
where: { id: req.params.id }, 
include: { signers: true, events: true } 
}); 
if (!env) return res.status(404).end(); 
res.json(env); 
}); 
