import { Router } from "express"; 
import { z } from "zod"; 
import { sendTask, retryTask } from "../services/tasks"; 
import { prisma } from "../infra/prisma"; 
export const router = Router(); 
router.post("/:taskId/send", async (req, res) => { 
const out = await sendTask(req.params.taskId); 
res.json(out); 
}); 
router.post("/:taskId/retry", async (req, res) => { 
const out = await retryTask(req.params.taskId); 
res.json(out); 
}); 
router.get("/incident/:incidentId", async (req, res) => { 
const rows = await prisma.notificationTask.findMany({ where: { 
incidentId: req.params.incidentId }, orderBy: { dueAt: "asc" }}); 
res.json(rows); 
}); 
