import { prisma } from "../infra/prisma"; 
import { processTask } from "../services/orchestrator"; 
async function loop() { 
const task = await prisma.dSARTask.findFirst({ where: { status: 
"pending" }, orderBy: { createdAt: "asc" }}); 
if (task) await processTask(task.id); 
setTimeout(loop, task ? 100 : 1000); 
} 
loop(); 
Frontend — Admin DSAR Console 
