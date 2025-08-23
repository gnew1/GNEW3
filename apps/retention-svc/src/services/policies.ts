import fs from "fs/promises"; 
import path from "path"; 
import yaml from "yaml"; 
import { prisma } from "../infra/prisma"; 
 
export async function loadPolicyFile() { 
  const p = path.join(process.cwd(), "config", 
"retention.policies.yaml"); 
  const raw = await fs.readFile(p, "utf8"); 
  return yaml.parse(raw); 
} 
 
export async function materializePolicies(doc: any) { 
  const version = doc.version; 
  const defaults = doc.defaults ?? {}; 
  const rules = doc.rules ?? []; 
  // invalidar versiones anteriores y crear snapshot de la nueva 
  await prisma.$transaction([ 
    prisma.retentionPolicy.updateMany({ data: { isActive: false } }), 
  ]); 
  let count = 0; 
  for (const r of rules) { 
    await prisma.retentionPolicy.create({ 
      data: { 
        version, 
        scope: r.match, 
        action: r.action ?? defaults.action, 
        ttlDays: (r.ttl_days ?? defaults.ttl_days) as number, 
        fieldsAllow: r.fields_allow ?? null, 
        isActive: true 
      } 
    }); 
    count++; 
  } 
  return count; 
} 
 
