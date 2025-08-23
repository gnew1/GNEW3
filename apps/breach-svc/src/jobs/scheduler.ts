import { prisma } from "../infra/prisma"; 
import { loadPolicies } from "../services/config"; 
import { sendTask } from "../services/tasks"; 
import { anchorRecent } from "../services/timeline"; 
 
async function tick() { 
  const pol = await loadPolicies(); 
  const retry = pol.defaults?.retry_policy ?? { max_attempts: 5, 
base_delay_ms: 30000, jitter_ms: 5000 }; 
 
  // 1) enviar tareas vencidas o reintentos 
  const now = new Date(); 
  const tasks = await prisma.notificationTask.findMany({ where: { 
    OR: [ 
      { status: "pending", dueAt: { lte: now }}, 
      { status: { in: ["failed","sent"] }, attempts: { lt: 
retry.max_attempts }} 
    ] 
  }, orderBy: { dueAt: "asc" }, take: 10 }); 
 
  for (const t of tasks) { 
    const nextDelay = Math.min(30*60_000, retry.base_delay_ms * 
Math.pow(2, t.attempts)) + Math.floor(Math.random()*retry.jitter_ms); 
    const nextAllowed = new Date((t.updatedAt as any).getTime() + 
nextDelay); 
    if (t.status === "pending" || now >= nextAllowed) { 
      await sendTask(t.id).catch(()=>{}); 
    } 
  } 
 
  // 2) anclaje periódico por incidente con nuevos eventos 
  const incs = await prisma.incident.findMany({ where: { status: { in: 
["open","contained","notified","closed"] }}, select: { id: true }}); 
  for (const i of incs) await anchorRecent(i.id).catch(()=>{}); 
 
  setTimeout(tick, 10_000); 
} 
tick(); 
 
