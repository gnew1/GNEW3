import { Router } from "express"; 
import { z } from "zod"; 
import { addTimeline } from "../services/timeline"; 
import { prisma } from "../infra/prisma"; 
export const router = Router(); 
router.get("/:incidentId", async (req, res) => { 
const rows = await prisma.timelineEntry.findMany({ where: { 
incidentId: req.params.incidentId }, orderBy: { at: "asc" }}); 
res.json(rows); 
}); 
router.post("/:incidentId", async (req, res) => { 
const Body = z.object({ type: z.string(), note: z.string(), actor: 
z.string().optional() }); 
const out = await addTimeline(req.params.incidentId, 
Body.parse(req.body)); 
res.status(201).json(out); 
}); 
