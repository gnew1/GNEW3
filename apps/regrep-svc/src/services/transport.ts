import path from "path"; 
import fs from "fs/promises"; 
import fetch from "node-fetch"; 
import SftpClient from "ssh2-sftp-client"; 
import crypto from "crypto"; 
import { prisma } from "../infra/prisma"; 
export async function deliver(run:any, def:any, filePath:string, 
mime:string, sha256:string, defaults:any) { 
if (def.transport === "https") return deliverHTTPS(run, def, 
filePath, mime, sha256); 
if (def.transport === "sftp")  return deliverSFTP(run, def, 
filePath, sha256); 
throw new Error("UNKNOWN_TRANSPORT"); 
} 
async function deliverHTTPS(run:any, def:any, filePath:string, 
mime:string, sha256:string) { 
const cfg = def.config.http; 
const body = await fs.readFile(filePath); 
const headers:any = { "Content-Type": mime, "X-Checksum-SHA256": 
sha256 }; 
if (cfg.bearer_env) headers["Authorization"] = `Bearer 
${process.env[cfg.bearer_env]}`; 
const opts:any = { method:"POST", headers, body }; 
if (cfg.auth?.kind === "mtls") { 
opts.agent = new (require("https").Agent)({ 
cert: process.env[cfg.auth.cert_env], key: 
process.env[cfg.auth.key_env], rejectUnauthorized: true 
}); 
} 
const started = new Date(); 
const r = await fetch(cfg.url, opts); 
const text = await r.text(); 
const finished = new Date(); 
  const resp = safeJson(text); 
  const ack = extractAck(resp, cfg.ack); 
  await prisma.deliveryAttempt.create({ data: { runId: run.id, 
transport: "https", url: cfg.url, status: r.ok ? "sent" : "failed", 
response: resp, startedAt: started, finishedAt: finished }}); 
  // Persist ACK as artifact 
  if (ack.id) { 
    const ackPath = path.join(`/mnt/data/regrep/${run.id}`, 
`ack_${ack.id}.json`); 
    await fs.writeFile(ackPath, JSON.stringify(resp, null, 2), 
"utf8"); 
    const hash = 
crypto.createHash("sha256").update(JSON.stringify(resp)).digest("hex")
 ; 
    await prisma.reportArtifact.create({ data: { runId: run.id, kind: 
"ack", path: ackPath, mime: "application/json", size: 
Buffer.byteLength(text), sha256: hash }}); 
    await prisma.reportEvidence.create({ data: { runId: run.id, kind: 
"ack_hash", content: { sha256: hash, id: ack.id, at: ack.at }}}); 
  } 
  if (!r.ok) throw new Error(`HTTPS_DELIVERY_FAILED ${r.status}`); 
  return { messageId: resp?.receipt?.id ?? resp?.ackId ?? null, ack: 
ack ? { ...ack, hash: undefined } : null }; 
} 
 
async function deliverSFTP(run:any, def:any, filePath:string, 
sha256:string) { 
  const cfg = def.config.sftp; 
  const client = new SftpClient(); 
  const started = new Date(); 
  await client.connect({ 
    host: cfg.host, port: cfg.port ?? 22, 
    username: process.env[cfg.username_env], 
    password: process.env[cfg.password_env] 
  }); 
  const remote = path.posix.join(cfg.remote_dir, 
path.basename(filePath)); 
  await client.fastPut(filePath, remote); 
  await client.end(); 
  const finished = new Date(); 
  await prisma.deliveryAttempt.create({ data: { runId: run.id, 
transport: "sftp", url: `${cfg.host}:${cfg.remote_dir}`, status: 
"sent", response: { remote, sha256 }, startedAt: started, finishedAt: 
finished }}); 
 
  // ACK por patrón (polling inmediato + diferido) 
  let ackId: string | null = null, ackAt: string | null = null, 
ackHash: string | null = null; 
  if (cfg.ack_pattern) { 
    const ackName = cfg.ack_pattern.replace("{{basename}}", 
path.basename(filePath)); 
    // intento de lectura inmediata (puede tardar; real → job de poll) 
    try { 
      await client.connect({ 
        host: cfg.host, port: cfg.port ?? 22, 
        username: process.env[cfg.username_env], 
        password: process.env[cfg.password_env] 
      }); 
      const ackRemote = path.posix.join(cfg.remote_dir, ackName); 
      const tmp = await client.get(ackRemote) as Buffer; 
      await client.end(); 
      const localAck = path.join(`/mnt/data/regrep/${run.id}`, 
ackName); 
      await fs.writeFile(localAck, tmp); 
      const hash = 
crypto.createHash("sha256").update(tmp).digest("hex"); 
      ackId = ackName; ackAt = new Date().toISOString(); ackHash = 
hash; 
      await prisma.reportArtifact.create({ data: { runId: run.id, 
kind: "ack", path: localAck, mime: "text/plain", size: tmp.length, 
sha256: hash }}); 
      await prisma.reportEvidence.create({ data: { runId: run.id, 
kind: "ack_hash", content: { sha256: hash, name: ackName }}}); 
    } catch { /* no disponible aún, quedará 'sent' hasta poll */ } 
  } 
return { messageId: remote, ack: ackId ? { id: ackId, at: ackAt, 
hash: ackHash } : null }; 
} 
function safeJson(s:string){ try{ return JSON.parse(s); }catch{return 
{ raw:s }}} 
function extractAck(resp:any, spec:any){ if(!spec) return null; 
const id = getPath(resp, spec.path); const at = spec.timestamp ? 
getPath(resp, spec.timestamp) : null; 
return id ? { id, at } : null; 
} 
function getPath(obj:any, path:string){ try { return 
path.split(".").reduce((o,k)=>o?.[k.replace("$","")], obj); } catch { 
return null; } } 
