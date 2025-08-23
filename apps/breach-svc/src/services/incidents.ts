import { prisma } from "../infra/prisma"; 
import { loadPolicies } from "./config"; 
import crypto from "crypto"; 
import { addTimeline, anchorRecent } from "./timeline"; 
import { scheduleTasksForJurisdictions } from "./schedule"; 
 
export async function createIncident(input: { 
  discoveredAt: string; detectedBy?: string; summary: string; 
description?: string; vector?: string; 
  jurisdictions: string[]; initialCategories: Array<{ 
dataCategory:string; approximateCount?:number; 
encryptedAtRest?:boolean; encryptedInUse?:boolean; 
hashedOnly?:boolean; }>; 
}) { 
  const count = await prisma.incident.count(); 
  const shortCode = `INC-${new 
Date().getFullYear()}-${String(count+1).padStart(4,"0")}`; 
  const inc = await prisma.incident.create({ 
    data: { 
      shortCode, discoveredAt: new Date(input.discoveredAt), 
detectedBy: input.detectedBy ?? null, 
      summary: input.summary, description: input.description ?? "", 
vector: input.vector ?? null, 
      jurisdictions: input.jurisdictions 
    } 
  }); 
  if (input.initialCategories?.length) { 
    await prisma.impactedCategory.createMany({ data: 
input.initialCategories.map(c => ({ incidentId: inc.id, ...c }))}); 
  } 
  // Checklist baseline + jurisdiccional 
  const pol = await loadPolicies(); 
  const baseline = pol.checklists?.baseline ?? []; 
  const addl = input.jurisdictions.flatMap(j => pol.checklists?.[j] ?? 
[]); 
  const items = [...baseline, ...addl]; 
  if (items.length) { 
await prisma.checklistItem.createMany({ data: 
items.map((it:any)=>({ incidentId: inc.id, key: it.key, title: 
it.title, description: it.description, mandatory: true }))}); 
} 
await addTimeline(inc.id, { type: "created", note: "Incidente 
creado", actor: input.detectedBy ?? "system" }); 
return inc; 
} 
export async function assessIncident(id: string, input: { 
severity:"S0"|"S1"|"S2"|"S3"; riskScore:number; dataSubjects?:number; 
categories?: any[] }) { 
const inc = await prisma.incident.update({ where: { id }, data: { 
severity: input.severity, riskScore: input.riskScore, dataSubjects: 
input.dataSubjects ?? null }}); 
if (input.categories?.length) { 
await prisma.impactedCategory.deleteMany({ where: { incidentId: id 
}}); 
await prisma.impactedCategory.createMany({ data: 
input.categories.map((c:any)=>({ incidentId: id, ...c }))}); 
} 
await addTimeline(id, { type: "updated", note: `Evaluación: 
${input.severity} (riesgo ${input.riskScore})` }); 
return inc; 
} 
export async function buildSchedule(id: string) { 
const inc = await prisma.incident.findUnique({ where: { id }, 
include: { categories: true }}); 
if (!inc) throw new Error("INCIDENT_NOT_FOUND"); 
const tasks = await scheduleTasksForJurisdictions(inc); 
await addTimeline(id, { type: "schedule", note: `Cronograma generado 
(${tasks.length} tareas)` }); 
return { count: tasks.length }; 
} 
export async function closeIncident(id: string, reason: string) { 
  const out = await prisma.incident.update({ where: { id }, data: { 
status: "closed" }}); 
  await addTimeline(id, { type: "closed", note: reason }); 
  // anclar últimos eventos del incidente 
  await anchorRecent(id); 
  return out; 
} 
 
