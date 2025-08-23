import { prisma } from "../infra/prisma"; 
import { materializeDefinitions, scheduleIfDue, processRun } from 
"../services/orchestrator"; 
import { loadConfig } from "../services/config"; 
async function tick() { 
// 1) materializar definiciones si cambió versión 
await materializeDefinitions(); 
// 2) programar runs debido a cron 
const defs = await prisma.reportDefinition.findMany({ where: { 
active: true }}); 
for (const d of defs) await scheduleIfDue(d); 
// 3) procesar runs en cola con backoff 
const doc = await loadConfig(); 
const retry = doc.defaults?.retry_policy ?? { max_attempts: 5, 
base_delay_ms: 2000, jitter_ms: 500 }; 
const pending = await prisma.reportRun.findMany({ where: { status: { 
in: ["scheduled","delivering","sent"] }}, orderBy: { createdAt: "asc" 
}, take: 10 }); 
for (const r of pending) { 
    const delay = Math.min(60_000, retry.base_delay_ms * Math.pow(2, 
r.attempts)) + Math.floor(Math.random()*retry.jitter_ms); 
    const nextAllowed = new Date((r.updatedAt as any).getTime() + 
delay); 
    if (new Date() >= nextAllowed) { 
      await processRun(r.id); 
    } 
  } 
  setTimeout(tick, 10_000); 
} 
tick(); 
 
