import { Router } from "express"; 
import { z } from "zod"; 
import { prisma } from "../infra/prisma"; 
export const router = Router(); 
router.post("/:incidentId/:itemId/toggle", async (req, res) => { 
const item = await prisma.checklistItem.findUnique({ where: { id: 
req.params.itemId }}); 
if (!item || item.incidentId !== req.params.incidentId) return 
res.status(404).end(); 
const status = item.status === "done" ? "pending" : "done"; 
const doneAt = status === "done" ? new Date() : null; 
const out = await prisma.checklistItem.update({ where: { id: item.id 
}, data: { status, doneAt }}); 
res.json(out); 
}); 
