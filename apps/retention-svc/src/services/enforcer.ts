import crypto from "crypto"; 
import { prisma } from "../infra/prisma"; 
import { postgresConnector } from 
"../../../packages/retention-connectors/src/postgres"; 
import { s3Connector } from 
"../../../packages/retention-connectors/src/s3"; 
import { anchorBatch } from "./anchor"; 
const connectors = { 
"postgres": postgresConnector(), 
"s3": s3Connector() 
}; 
export async function enforceDueTags(limit = 500) { 
const due = await prisma.retentionTag.findMany({ 
where: { expireAt: { lte: new Date() }, legalHold: false }, 
take: limit 
}); 
if (due.length === 0) return { done: 0 }; 
const batch: string[] = []; 
for (const t of due) { 
const target = parseSystem(t.system); // ej. "postgres:core.users" 
| "s3:attachments" 
const conn = connectors[target.kind]; 
const res = await conn.apply({ 
system: target.system, resourceType: t.resourceType, resourceId: 
t.resourceId, 
      action: await policyActionForTag(t.id) 
    }); 
 
    const payload = { tagId: t.id, action: res.action, result: 
res.result, at: new Date().toISOString() }; 
    const eventHash = sha256(payload); 
    await prisma.retentionEvent.create({ data: { tagId: t.id, action: 
res.action, result: res.result, eventHash }}); 
    batch.push(eventHash); 
 
    // Si ya está borrado/anonimizado, puedes eliminar el tag o 
reprogramar si compact 
    if (res.action === "delete" || res.action === "anonymize") { 
      await prisma.retentionTag.delete({ where: { id: t.id }}); 
    } else if (res.action === "compact") { 
      // deja el tag para el siguiente nivel (agg) si aplica 
      await prisma.retentionTag.update({ where: { id: t.id }, data: { 
expireAt: new Date(Date.now() + 24*3600*1000) }}); 
    } 
  } 
 
  // anclaje de lote 
  if (batch.length > 0) { 
    const { txHash, batchId } = await anchorBatch(batch); 
    await prisma.retentionEvent.updateMany({ 
      where: { eventHash: { in: batch } }, 
      data: { batchId, txHash } 
    }); 
  } 
 
  return { done: due.length }; 
} 
 
function sha256(o:any) { return 
crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex"); } 
 
function parseSystem(s: string) { 
  const [kind, system] = s.split(":"); 
return { kind, system }; 
} 
async function policyActionForTag(tagId: string) { 
const tag = await prisma.retentionTag.findUnique({ where: { id: 
tagId }}); 
const rp = await prisma.retentionPolicy.findFirst({ where: { 
version: tag?.policyVersion, isActive: true }}); 
return (rp?.action ?? "delete") as 
"delete"|"anonymize"|"compact"|"s3_lifecycle"; 
} 
