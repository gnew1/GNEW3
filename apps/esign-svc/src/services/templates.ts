import fs from "fs/promises"; 
import path from "path"; 
import yaml from "yaml"; 
import crypto from "crypto"; 
import { prisma } from "../infra/prisma"; 
 
export async function reloadTemplates() { 
  const base = path.join(process.cwd(), "config", "templates"); 
  const keys = await fs.readdir(base); 
  let count = 0; 
  for (const key of keys) { 
    const versions = await fs.readdir(path.join(base, key)); 
    let current = ""; 
    for (const ver of versions) { 
      const meta = yaml.parse(await 
fs.readFile(path.join(base,key,ver,"metadata.yaml"), "utf8")); 
      const html = await 
fs.readFile(path.join(base,key,ver,"template.html"), "utf8"); 
      const checksum = sha256(meta) + "-" + sha256(html); 
      const locale = meta.locale || "es-ES"; 
      const tmpl = await prisma.legalTemplate.upsert({ 
        where: { key }, 
        update: { title: meta.title, jurisdiction: meta.jurisdiction, 
purpose: meta.purpose, currentVer: meta.semver, isActive: true }, 
        create: { key, title: meta.title, jurisdiction: 
meta.jurisdiction, purpose: meta.purpose, currentVer: meta.semver, 
isActive: true } 
      }); 
      await prisma.templateVersion.upsert({ 
        where: { templateId_semver_locale: { templateId: tmpl.id, 
semver: meta.semver, locale } }, 
        update: { checksum, fieldsSchema: meta.fields_schema, html }, 
        create: { templateId: tmpl.id, semver: meta.semver, checksum, 
fieldsSchema: meta.fields_schema, html, locale } 
      }); 
      current = meta.semver; 
      count++; 
    } 
    if (current) await prisma.legalTemplate.update({ where: { key }, 
data: { currentVer: current }}); 
  } 
  return count; 
} 
 
function sha256(obj:any){ return 
crypto.createHash("sha256").update(typeof 
obj==="string"?obj:JSON.stringify(obj)).digest("hex"); } 
 
