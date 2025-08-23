import path from "path"; 
import fs from "fs/promises"; 
import crypto from "crypto"; 
import { queryRows } from "./sources"; 
import { prisma } from "../infra/prisma"; 
import { pgpEncryptAndSign } from "./security"; 
import { toCSV } from "./render"; 
 
export async function generateReport(run:any, def:any, defaults:any) { 
  const sql = def.config?.extract?.sql as string; 
  const rows = await queryRows(sql, run.periodStart, run.periodEnd); 
  const manifest = { defKey: def.key, version: def.version, period: { 
start: run.periodStart, end: run.periodEnd }, rowCount: rows.length }; 
  await prisma.reportEvidence.create({ data: { runId: run.id, kind: 
"row_count", content: { count: rows.length }}}); 
  const dir = `/mnt/data/regrep/${run.id}`; 
  await fs.mkdir(dir, { recursive: true }); 
  const basename = `${def.key}_${new 
Date(run.periodEnd).toISOString().slice(0,10)}`; 
  let dataBuf: Buffer, mime = "application/json", fileName = 
`${basename}.json`; 
 
  if (def.format === "csv") { 
    const csv = toCSV(rows, def.config?.csv?.delimiter ?? ",", 
!!def.config?.csv?.header); 
    dataBuf = Buffer.from(csv, "utf8"); 
    mime = "text/csv"; fileName = `${basename}.csv`; 
  } else { 
    dataBuf = Buffer.from(JSON.stringify(rows, null, 2), "utf8"); 
  } 
 
  const dataPath = path.join(dir, fileName); 
  await fs.writeFile(dataPath, dataBuf); 
  const sha256 = 
crypto.createHash("sha256").update(dataBuf).digest("hex"); 
  await prisma.reportArtifact.create({ data: { runId: run.id, kind: 
"data", path: dataPath, mime, size: dataBuf.length, sha256 }}); 
  await prisma.reportArtifact.create({ data: { runId: run.id, kind: 
"manifest", path: path.join(dir,"manifest.json"), mime: 
"application/json", 
size: Buffer.byteLength(JSON.stringify(manifest)), sha256: 
crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("h
 ex") }}); 
// PGP (opcional) 
if (defaults.pgp?.encrypt || def.config?.pgp?.encrypt) { 
const enc = await pgpEncryptAndSign(dataBuf, 
(def.config?.pgp?.recipients ?? defaults.pgp.recipients) as string[], 
defaults.pgp?.sign ?? false); 
const encPath = path.join(dir, `${fileName}.pgp`); 
await fs.writeFile(encPath, enc); 
const encSha = 
crypto.createHash("sha256").update(enc).digest("hex"); 
await prisma.reportArtifact.create({ data: { runId: run.id, kind: 
"pgp_encrypted", path: encPath, mime: "application/octet-stream", 
size: enc.length, sha256: encSha }}); 
return { outPath: encPath, mime: "application/octet-stream", 
sha256: encSha, basename: path.basename(encPath) }; 
} 
return { outPath: dataPath, mime, sha256, basename: 
path.basename(dataPath) }; 
} 
