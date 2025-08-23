import { prisma } from "../infra/prisma"; 
 
type TagLike = { system:string; dataCategory:string; purpose:string; 
region?:string; baseLegal:string }; 
 
export async function resolvePolicyFor(tag: TagLike) { 
  const policies = await prisma.retentionPolicy.findMany({ where: { 
isActive: true }}); 
  const matchScore = (p:any) => { 
    const m = p.scope as any; 
    let score = 0; 
    if (!m) return 0; 
    for (const [k,v] of Object.entries(m)) { 
      if ((tag as any)[k] === v) score += 1; else return -1; 
    } 
    return score; 
  }; 
  let best = null as any, bestScore = -1; 
  for (const p of policies) { 
    const s = matchScore(p); 
    if (s > bestScore) { best = p; bestScore = s; } 
  } 
  // fallback: defaults 
  if (!best) { 
best = await prisma.retentionPolicy.findFirst({ where: { isActive: 
true }, orderBy: { createdAt: "asc" }}); 
} 
return { version: best?.version ?? "v0", ttlDays: best?.ttlDays ?? 
365, action: best?.action ?? "delete", fieldsAllow: best?.fieldsAllow 
?? null }; 
} 
