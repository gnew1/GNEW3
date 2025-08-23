import { prisma } from "../infra/prisma"; 
import { loadPolicies, loadTemplate } from "./config"; 
import crypto from "crypto"; 
import fetch from "node-fetch"; 
 
export async function renderTaskPayload(task: any) { 
  const inc = await prisma.incident.findUnique({ where: { id: 
task.incidentId }, include: { categories: true }}); 
  const pol = await loadPolicies(); 
  const tdef = pol.templates?.[task.templateKey]; 
  const md = await loadTemplate(tdef.content_md); 
  const vars = { 
    controller_name: process.env.CONTROLLER_NAME || "GNEW", 
    controller_contact: process.env.CONTROLLER_CONTACT || 
"privacy@gnew.org", 
    discovered_at: inc!.discoveredAt.toISOString(), 
    summary: inc!.summary, 
    vector: inc!.vector ?? "N/D", 
    categories: inc!.categories.map(c=>c.dataCategory).join(", "), 
    data_subjects: inc!.dataSubjects ?? "N/D", 
    measures: "Contención y mitigación en curso.", 
    risk_level: inc!.riskScore >= 0.7 ? "alto" : "moderado", 
    dpo_contact: process.env.DPO_CONTACT || "dpo@gnew.org", 
    pdf_hash: "N/A", 
    recommendations: "Cambia tu contraseña y habilita MFA si aplica." 
  }; 
  const body = md.replace(/\{\{(\w+)\}\}/g, (_m, k)=> (vars as any)[k] 
?? ""); 
  const sha = crypto.createHash("sha256").update(body).digest("hex"); 
  return { body, sha, channel: tdef.channel }; 
} 
 
export async function sendTask(taskId: string) { 
  const task = await prisma.notificationTask.findUnique({ where: { id: 
taskId }}); 
  if (!task) throw new Error("TASK_NOT_FOUND"); 
  // render 
  const { body, sha, channel } = await renderTaskPayload(task); 
  const now = new Date(); 
  // deliver (stub): https posts to authority, email via webhook 
  let ok = false, ackId: string | null = null, ackAt: Date | null = 
null, responseSha: string | null = null; 
  try { 
    if (channel === "https") { 
      const url = await resolveAuthorityUrl(task); 
      const r = await fetch(url, { method: "POST", headers: { 
"Content-Type":"text/markdown" }, body }); 
      const txt = await r.text(); 
      ok = r.ok; ackId = r.ok ? (r.headers.get("x-ack-id") || null) : 
null; 
      ackAt = r.ok ? new Date() : null; 
      responseSha = 
crypto.createHash("sha256").update(txt).digest("hex"); 
    } else if (channel === "email") { 
      // En producción: integra email-svc; aquí se simula webhook 
      ok = true; ackId = `EMAIL-${Date.now()}`; ackAt = new Date(); 
      responseSha = 
crypto.createHash("sha256").update("OK").digest("hex"); 
    } else { 
      // manual: solo registramos payload 
      ok = true; ackId = `MANUAL-${Date.now()}`; ackAt = new Date(); 
    } 
  } catch (e:any) { 
    ok = false; 
  } 
  const status = ok ? (ackId ? "acknowledged" : "sent") : "failed"; 
 
  const out = await prisma.notificationTask.update({ 
    where: { id: taskId }, 
    data: { sentAt: now, status, ackId, ackAt, payloadSha: sha, 
responseSha, lastError: ok? null : "DELIVERY_ERROR", attempts: { 
increment: 1 } as any } 
  }); 
  await prisma.timelineEntry.create({ 
    data: { 
      incidentId: task.incidentId, type: task.kind === "data_subjects" 
? "subjects_notified" : "authority_notified", 
      note: `${task.templateKey} ${status} (ack=${ackId ?? "n/a"})`, 
      prevHash: await lastHash(task.incidentId), eventHash: hash({ 
taskId, status, at: new Date().toISOString() }) 
    } 
}); 
return out; 
} 
export async function retryTask(taskId: string) { 
const t = await prisma.notificationTask.findUnique({ where: { id: 
taskId }}); 
if (!t) throw new Error("TASK_NOT_FOUND"); 
if (t.status === "acknowledged") return t; 
return sendTask(taskId); 
} 
async function resolveAuthorityUrl(task:any){ 
const pol = await loadPolicies(); 
for (const j of Object.values(pol.jurisdictions||{})) { 
const dir:any[] = (j as any).authority_directory ?? []; 
const f = dir.find(d => d.key === task.targetKey); 
if (f) return f.url || "https://example.gov/ingest"; 
} 
return "https://example.gov/ingest"; 
} 
function hash(o:any){ return 
require("crypto").createHash("sha256").update(JSON.stringify(o)).diges
 t("hex"); } 
async function lastHash(incidentId:string){ 
const e = await prisma.timelineEntry.findFirst({ where: { incidentId 
}, orderBy: { at: "desc" }}); 
return e?.eventHash ?? null; 
} 
