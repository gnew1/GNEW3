import { prisma } from "../infra/prisma"; 
import { z } from "zod"; 
import Ajv from "ajv"; 
import Handlebars from "handlebars"; 
import fs from "fs/promises"; 
import path from "path"; 
import crypto from "crypto"; 
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"; 
import { anchorBatch } from "./onchain"; 
 
const ajv = new Ajv({ removeAdditional: false, allErrors: true }); 
 
export async function createEnvelope(input: { 
  templateKey: string; locale: string; data: any; createdBy: string; 
  signers: Array<{ role:string; name:string; email?:string; 
subjectId?:string; order:number; }> 
}) { 
  const tmpl = await prisma.legalTemplate.findUnique({ where: { key: 
input.templateKey }, include: { versions: true }}); 
  if (!tmpl) throw new Error("TEMPLATE_NOT_FOUND"); 
  const ver = tmpl.versions.find(v => v.semver === tmpl.currentVer && 
v.locale === input.locale) || tmpl.versions[0]; 
  if (!ver) throw new Error("TEMPLATE_VERSION_NOT_FOUND"); 
 
  const validate = ajv.compile(ver.fieldsSchema as any); 
  if (!validate(input.data)) throw new Error("DATA_SCHEMA_INVALID " + 
JSON.stringify(validate.errors)); 
 
  const prevEvent = await prisma.auditEvent.findFirst({ where: {}, 
orderBy: { at: "desc" }}); 
  const ev = await prisma.envelope.create({ 
    data: { 
      templateKey: tmpl.key, templateVer: ver.semver, locale: 
ver.locale, 
      status: "draft", data: input.data, createdBy: input.createdBy, 
      manifest: { templateChecksum: ver.checksum }, 
      prevHash: prevEvent?.eventHash ?? null, 
      eventHash: "pending" 
    } 
  }); 
  await prisma.signer.createMany({ data: input.signers.map(s => ({ 
envelopeId: ev.id, ...s })) }); 
 
  const ehash = hashEvent({ type:"envelope.created", envelopeId: 
ev.id, at: new Date().toISOString(), template: { key: tmpl.key, ver: 
ver.semver }}); 
  await prisma.auditEvent.create({ data: { envelopeId: ev.id, 
type:"envelope.created", payload: { createdBy: input.createdBy }, 
prevHash: ev.prevHash, eventHash: ehash }}); 
  await prisma.envelope.update({ where: { id: ev.id }, data: { 
eventHash: ehash }}); 
  return ev; 
} 
 
export async function renderEnvelopePDF(envelopeId: string) { 
  const env = await prisma.envelope.findUnique({ where: { id: 
envelopeId }}); 
  if (!env) throw new Error("ENVELOPE_NOT_FOUND"); 
  const tmpl = await prisma.legalTemplate.findUnique({ where: { key: 
env.templateKey }, include: { versions: true }}); 
  const ver = tmpl!.versions.find(v => v.semver === env.templateVer && 
v.locale === env.locale)!; 
 
  // render HTML → PDF (estrategia simple: HTML→PDF con Chromium 
externo sería ideal; aquí: convertimos HTML a PDF con pdf-lib sobre 
texto plano) 
  // Para producción, sustituir por Puppeteer que imprima HTML. Aquí 
incluimos el HTML original como texto concatenado (resultado válido 
para demo & hashing). 
  const html = injectMeta(ver.html, { 
    template_key: env.templateKey, template_version: env.templateVer, 
    jurisdiction: tmpl!.jurisdiction ?? "", template_checksum: 
ver.checksum, ...env.data 
  }); 
 
  const pdf = await PDFDocument.create(); 
  const page = pdf.addPage([595, 842]); // A4 
  const font = await pdf.embedFont(StandardFonts.Helvetica); 
  const fontSize = 10; 
  const lines = wrapText(stripTags(html), 90); 
  let y = 800; 
  for (const line of lines) { 
    page.drawText(line, { x: 40, y, size: fontSize, font, color: 
rgb(0,0,0) }); 
    y -= 14; 
    if (y < 40) { pdf.addPage([595,842]); y = 800; } 
  } 
const bytes = await pdf.save(); 
const dir = `/mnt/data/esign/${envelopeId}`; 
await fs.mkdir(dir, { recursive: true }); 
const pdfPath = path.join(dir, "document.pdf"); 
await fs.writeFile(pdfPath, Buffer.from(bytes)); 
const sha = sha256(bytes); 
await prisma.envelope.update({ where: { id: envelopeId }, data: { 
pdfPath, pdfSha256: sha, status: "ready" }}); 
await prisma.auditEvent.create({ data: { envelopeId, 
type:"envelope.rendered", payload: { pdfPath, sha256: sha }, prevHash: 
await lastHash(envelopeId), eventHash: hashEvent({ 
type:"envelope.rendered", envelopeId, sha }) }}); 
return { pdfPath, sha256: sha }; 
} 
export async function sendEnvelope(envelopeId: string) { 
const env = await prisma.envelope.findUnique({ where: { id: 
envelopeId }, include: { signers: true }}); 
if (!env) throw new Error("ENVELOPE_NOT_FOUND"); 
if (!env.pdfSha256) throw new Error("RENDER_FIRST"); 
await prisma.envelope.update({ where: { id: envelopeId }, data: { 
status: "sent" }}); 
await prisma.auditEvent.create({ data: { envelopeId, 
type:"envelope.sent", payload: { signers: env.signers.map(s=>({ 
id:s.id, email:s.email, name:s.name })) }, prevHash: await 
lastHash(envelopeId), eventHash: hashEvent({ type:"envelope.sent", 
envelopeId }) }}); 
return { ok: true, signerCount: env.signers.length }; 
} 
export async function signerLink(envelopeId: string, signerId: string) 
{ 
const signer = await prisma.signer.findUnique({ where: { id: 
signerId }}); 
if (!signer) throw new Error("SIGNER_NOT_FOUND"); 
const token = signToken({ envelopeId, signerId }); 
  return `${process.env.ESIGN_PUBLIC_BASE}/sign/${token}`; 
} 
 
export async function applySignature(token: string, ctx: { ip:string; 
userAgent:string; signatureImg?:string|null }) { 
  const payload = verifyToken(token); 
  const signer = await prisma.signer.findUnique({ where: { id: 
payload.signerId }}); 
  if (!signer) throw new Error("SIGNER_NOT_FOUND"); 
  if (signer.status === "signed") return { already: true }; 
 
  // Estampar “acuse” en PDF (página final con certificado resumido) 
  const env = await prisma.envelope.findUnique({ where: { id: 
payload.envelopeId }}); 
  if (!env?.pdfPath) throw new Error("PDF_MISSING"); 
  const pdfBytes = await fs.readFile(env.pdfPath); 
  const pdf = await PDFDocument.load(pdfBytes); 
  const page = pdf.addPage([595, 200]); 
  const font = await pdf.embedFont(StandardFonts.Helvetica); 
  const text = `Firmado por ${signer.name} (${signer.email ?? 
signer.subjectId ?? "externo"})\n` + 
               `IP: ${ctx.ip} · UA: ${ctx.userAgent}\n` + 
               `Fecha: ${new Date().toISOString()}`; 
  page.drawText("Certificado de firma", { x: 40, y: 170, size: 12, 
font }); 
  for (const [i, ln] of text.split("\n").entries()) { 
    page.drawText(ln, { x: 40, y: 140 - i*14, size: 10, font }); 
  } 
  // Estampa de imagen base64 si provista 
  if (ctx.signatureImg) { 
    const png = await 
pdf.embedPng(Buffer.from(ctx.signatureImg.replace(/^data:image\/png;ba
 se64,/,""), "base64")); 
    page.drawImage(png, { x: 380, y: 80, width: 160, height: 80 }); 
  } 
  const out = await pdf.save(); 
  await fs.writeFile(env.pdfPath, Buffer.from(out)); 
  const newSha = sha256(out); 
await prisma.signer.update({ where: { id: signer.id }, data: { 
status: "signed", signedAt: new Date(), ip: ctx.ip, userAgent: 
ctx.userAgent, signatureImg: ctx.signatureImg ?? null }}); 
await prisma.envelope.update({ where: { id: env.id }, data: { 
pdfSha256: newSha, status: await isCompleted(env.id) ? "completed" : 
"partially_signed" }}); 
await prisma.auditEvent.create({ data: { envelopeId: env.id, 
type:"signer.signed", payload: { signerId: signer.id, sha256: newSha 
}, prevHash: await lastHash(env.id), eventHash: hashEvent({ 
type:"signer.signed", envelopeId: env.id, signerId: signer.id, sha: 
newSha }) }}); 
// Si completado ⇒ anclar hash del PDF + hash de la cadena de 
eventos 
if (await isCompleted(env.id)) { 
const chain = await prisma.auditEvent.findMany({ where: { 
envelopeId: env.id }, orderBy: { at: "asc" }}); 
const chainHash = sha256(chain.map(e=>e.eventHash).join("|")); 
await prisma.envelope.update({ where: { id: env.id }, data: { 
certPath: env.pdfPath }}); 
// anclaje 
const { batchId, txHash } = await anchorBatch([newSha, 
chainHash]); 
await prisma.envelope.update({ where: { id: env.id }, data: { 
batchId, txHash }}); 
await prisma.auditEvent.create({ data: { envelopeId: env.id, 
type:"envelope.completed", payload: { pdfSha256: newSha, chainHash, 
batchId, txHash }, prevHash: await lastHash(env.id), eventHash: 
hashEvent({ type:"envelope.completed", envelopeId: env.id, newSha, 
batchId }) }}); 
} 
return { ok: true, pdfSha256: newSha, status: await 
isCompleted(env.id) ? "completed" : "partially_signed" }; 
} 
export async function voidEnvelope(envelopeId: string, reason: string) 
{ 
await prisma.envelope.update({ where: { id: envelopeId }, data: { 
status: "voided" }}); 
await prisma.auditEvent.create({ data: { envelopeId, 
type:"envelope.voided", payload: { reason }, prevHash: await 
lastHash(envelopeId), eventHash: hashEvent({ type:"envelope.voided", 
envelopeId }) }}); 
} 
function stripTags(h:string){ return h.replace(/<[^>]+>/g," "); } 
function injectMeta(html:string, vars:Record<string,any>){ 
return html.replace(/\{\{(\w+)\}\}/g, (_m, k)=> vars[k] ?? ""); 
} 
function wrapText(s:string, width:number){ 
const words = s.split(/\s+/); const out:string[] = []; let line=""; 
for (const w of words){ if ((line + " " + w).trim().length > width){ 
out.push(line.trim()); line = w; } else line += " " + w; } 
if (line.trim().length) out.push(line.trim()); return out; 
} 
function sha256(b:Buffer|string){ return 
crypto.createHash("sha256").update(b).digest("hex"); } 
function hashEvent(obj:any){ return sha256(JSON.stringify(obj)); } 
async function lastHash(envelopeId:string){ const e = await 
prisma.auditEvent.findFirst({ where: { envelopeId }, orderBy: { at: 
"desc" } }); return e?.eventHash ?? null; } 
async function isCompleted(envelopeId:string){ 
const s = await prisma.signer.findMany({ where: { envelopeId }}); 
return s.length>0 && s.every(x=>x.status==="signed"); 
} 
// Firma/validación de token de firma (HMAC) 
function signToken(payload: { envelopeId:string; signerId:string }){ 
const p = 
Buffer.from(JSON.stringify(payload)).toString("base64url"); 
const mac = crypto.createHmac("sha256", 
process.env.ESIGN_HMAC_SECRET!).update(p).digest("base64url"); 
return `${p}.${mac}`; 
} 
function verifyToken(token:string){ 
  const [p, mac] = token.split("."); 
  const calc = crypto.createHmac("sha256", 
process.env.ESIGN_HMAC_SECRET!).update(p).digest("base64url"); 
  if (mac !== calc) throw new Error("BAD_TOKEN"); 
  return JSON.parse(Buffer.from(p, "base64url").toString("utf8")); 
} 
 
