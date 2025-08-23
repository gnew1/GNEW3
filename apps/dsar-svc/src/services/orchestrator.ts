import { prisma } from "../infra/prisma"; 
import { DSARRequest } from "@prisma/client"; 
import crypto from "crypto"; 
import * as fs from "fs/promises"; 
import path from "path"; 
import { prismaConnector } from 
"../../../packages/dsar-connectors/src/postgresPrisma"; 
import { s3Connector } from 
"../../../packages/dsar-connectors/src/s3"; 
import { signCertificate } from "./signing"; 
import { anchorBatch } from "./anchor"; 
const connectors = [ 
prismaConnector(`"User"`, "subjectId", ["email","phone"]),           
// ejemplo: anonimiza columnas 
prismaConnector(`"ConsentRecord"`, "subjectId", []),                 
// borra duro 
s3Connector(process.env.DSAR_S3_BUCKET!, "users/{subjectId}/") 
]; 
export async function enqueueTasksFor(req: DSARRequest) { 
// construir tareas para cada conector según tipo 
for (const c of connectors) { 
await prisma.dSARTask.create({ data: { requestId: req.id, 
connector: c.id, op: req.type === "access" ? "export":"erasure", 
status: "pending" }}); 
} 
} 
 
export async function processTask(taskId: string) { 
  const task = await prisma.dSARTask.findUnique({ where: { id: taskId 
}}); 
  if (!task) return; 
 
  const req = await prisma.dSARRequest.findUnique({ where: { id: 
task.requestId }}); 
  if (!req) return; 
 
  const ctx = { subjectId: req.subjectId, scope: req.scope, region: 
req.region }; 
  const c = connectors.find(x => x.id === task.connector); 
  if (!c) return; 
 
  try { 
    await prisma.dSARTask.update({ where: { id: taskId }, data: { 
status: "running", attempts: { increment: 1 } }}); 
    if (task.op === "export") { 
      const out = await c.exportData(ctx); 
      // zip opcional: aquí guardamos manifest de archivos 
      for (const f of out.files) { 
        await prisma.dSARArtifact.create({ data: { requestId: req.id, 
name: f.path.split("/").pop()!, mime: "application/json", path: 
f.path, sha256: f.sha256 }}); 
      } 
      await prisma.dSARTask.update({ where: { id: taskId }, data: { 
status: "done", result: out }}); 
    } else if (task.op === "erasure") { 
      const evBefore = await recordCountEvidence(req.id, c.id, ctx, 
"before"); 
      const er = await c.eraseData(ctx); 
      const evAfter = await recordCountEvidence(req.id, c.id, ctx, 
"after"); 
      await prisma.dSARTask.update({ where: { id: taskId }, data: { 
status: "done", result: er }}); 
      await generateOrUpdateErasureCertificate(req.id); 
      await anchorBatch(req.id); // opcional: ancla root del 
certificado/manifiesto 
    } else { 
      await prisma.dSARTask.update({ where: { id: taskId }, data: { 
status: "skipped" }}); 
    } 
  } catch (e:any) { 
    await prisma.dSARTask.update({ where: { id: taskId }, data: { 
status: "failed", result: { error: e.message } }}); 
  } 
} 
 
async function recordCountEvidence(requestId: string, connectorId: 
string, ctx: any, when: "before"|"after") { 
  // Este stub podría ejecutar COUNT(*) en origen; aquí registramos 
marca temporal 
  const content = { connectorId, when, at: new Date().toISOString() }; 
  await prisma.dSAREvidence.create({ data: { requestId, kind: 
`count_${when}`, content }}); 
  return content; 
} 
 
async function generateOrUpdateErasureCertificate(requestId: string) { 
  const tasks = await prisma.dSARTask.findMany({ where: { requestId, 
op: "erasure", status: "done" }}); 
  const payload = { 
    requestId, 
    generatedAt: new Date().toISOString(), 
    tasks: tasks.map(t => ({ connector: t.connector, result: t.result 
})), 
  }; 
  const { publicKey, signature } = await signCertificate(payload); 
  const json = JSON.stringify({ payload, signature, publicKey }, null, 
2); 
  const dir = `/mnt/data/dsar/${requestId}`; 
  await fs.mkdir(dir, { recursive: true }); 
  const filePath = path.join(dir, "erasure-certificate.json"); 
  await fs.writeFile(filePath, json, "utf8"); 
const sha256 = 
crypto.createHash("sha256").update(json).digest("hex"); 
await prisma.dSARArtifact.upsert({ 
where: { requestId_name: { requestId, name: 
"erasure-certificate.json" } as any }, 
update: { path: filePath, sha256, mime: "application/json" }, 
create: { requestId, name: "erasure-certificate.json", mime: 
"application/json", path: filePath, sha256 } 
} as any); 
} 
