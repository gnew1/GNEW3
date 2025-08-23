import { prisma } from "../infra/prisma"; 
import cronParser from "cron-parser"; 
import crypto from "crypto"; 
import { loadConfig } from "./config"; 
import { generateReport } from "./pipeline"; 
import { deliver } from "./transport"; 
import { anchorBatch } from "./anchor"; 
 
export async function materializeDefinitions() { 
  const doc = await loadConfig(); 
  const defs = doc.reports as any[]; 
  await prisma.$transaction([ 
    prisma.reportDefinition.updateMany({ data: { active: false }}) 
  ]); 
  for (const r of defs) { 
    await prisma.reportDefinition.upsert({ 
      where: { key: r.key }, 
      update: { version: doc.version, title: r.title, authority: 
r.authority, jurisdiction: r.jurisdiction, 
        schedule: r.schedule, transport: r.transport, format: 
r.format, config: r.config, active: true }, 
      create: { key: r.key, version: doc.version, title: r.title, 
authority: r.authority, jurisdiction: r.jurisdiction, 
        schedule: r.schedule, transport: r.transport, format: 
r.format, config: r.config, active: true } 
    }); 
  } 
  return defs.length; 
} 
 
export async function scheduleIfDue(def: any, nowStart?: Date, 
nowEnd?: Date, force=false) { 
  const period = computePeriod(def, nowStart, nowEnd); 
  const exists = await prisma.reportRun.findFirst({ where: { 
    defId: def.id, periodStart: period.start, periodEnd: period.end 
  }}); 
  if (exists && !force) return exists; 
  return prisma.reportRun.create({ data: { defId: def.id, periodStart: 
period.start, periodEnd: period.end, status: "scheduled" }}); 
} 
 
function computePeriod(def:any, start?:Date, end?:Date) { 
  if (start && end) return { start, end }; 
  // derivar del cron (ej: mensual: comienzo y fin del mes anterior) 
  const now = new Date(); 
  const it = cronParser.parseExpression(def.schedule, { currentDate: 
now }); 
  const prev = it.prev().toDate(); 
  // heurística simple: si schedule diario → día anterior; mensual → 
mes anterior 
  const isMonthly = / (\* ){3}\*/.test(def.schedule) || 
def.schedule.split(" ").length===5 && def.schedule.includes(" 1 "); 
  if (isMonthly) { 
    const s = new Date(prev.getFullYear(), prev.getMonth()-1, 1); 
    const e = new Date(prev.getFullYear(), prev.getMonth(), 1); 
    return { start: s, end: e }; 
  } 
  const s = new Date(prev.getFullYear(), prev.getMonth(), 
prev.getDate()-1, 0,0,0); 
  const e = new Date(prev.getFullYear(), prev.getMonth(), 
prev.getDate(), 0,0,0); 
  return { start: s, end: e }; 
} 
 
export async function processRun(runId: string) { 
  const run = await prisma.reportRun.findUnique({ where: { id: runId 
}, include: { definition: true }}); 
  if (!run) return; 
  const def = run.definition as any; 
  const doc = await loadConfig(); 
  const defaults = doc.defaults ?? {}; 
 
  try { 
    await prisma.reportRun.update({ where: { id: runId }, data: { 
status: "generating" }}); 
    const gen = await generateReport(run, def, defaults); 
    await prisma.reportRun.update({ where: { id: runId }, data: { 
status: "delivering" }}); 
    const del = await deliver(run, def, gen.outPath, gen.mime, 
gen.sha256, defaults); 
    const ackId = del.ack?.id ?? null; 
    const ackAt = del.ack?.at ? new Date(del.ack.at) : null; 
 
    await prisma.reportRun.update({ where: { id: runId }, data: { 
      status: ackId ? "acknowledged" : "sent", ackId, ackAt, 
messageId: del.messageId ?? null 
    }}); 
    await anchorBatch([gen.sha256, del.ack?.hash].filter(Boolean) as 
string[], runId); 
  } catch (e:any) { 
    const attempts = run.attempts + 1; 
    const docRetry = defaults.retry_policy ?? { max_attempts: 5, 
base_delay_ms: 2000, jitter_ms: 500 }; 
    const failed = attempts >= docRetry.max_attempts; 
    await prisma.reportRun.update({ where: { id: runId }, data: { 
status: failed? "failed" : "scheduled", attempts, error: 
String(e.message || e) }}); 
    if (!failed) { 
      // next attempt scheduled by scheduler loop (backoff handled 
there) 
    } 
  } 
} 
 
