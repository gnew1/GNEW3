import { prisma } from "../infra/prisma"; 
import crypto from "crypto"; 
 
// Jaro-Winkler simple 
function jaro(s1:string, s2:string) { 
  if (s1 === s2) return 1; 
  const mDist = Math.floor(Math.max(s1.length, s2.length)/2)-1; 
  const matches1 = new Array(s1.length).fill(false); 
  const matches2 = new Array(s2.length).fill(false); 
  let m=0, t=0; 
  for (let i=0;i<s1.length;i++){ 
    const start = Math.max(0, i - mDist); 
    const end = Math.min(i + mDist + 1, s2.length); 
    for (let j=start;j<end;j++) if(!matches2[j] && s1[i]===s2[j]) { 
matches1[i]=matches2[j]=true; m++; break; } 
  } 
  if (m===0) return 0; 
  let k=0; 
  for (let i=0;i<s1.length;i++) if(matches1[i]){ 
    while(!matches2[k]) k++; 
    if(s1[i]!==s2[k]) t++; 
    k++; 
  } 
  const jaro = (m/s1.length + m/s2.length + (m - t/2)/m)/3; 
  return jaro; 
} 
function winkler(s1:string, s2:string) { 
  const j = jaro(norm(s1), norm(s2)); 
  let l=0; for(let i=0;i<Math.min(4, s1.length, s2.length); i++) 
if(s1[i]===s2[i]) l++; else break; 
  return j + l*0.1*(1-j); 
} 
function norm(s:string){ return s.toLowerCase().replace(/[^a-z0-9 
]+/g," ").replace(/\s+/g," ").trim(); } 
 
export async function screen(input: { subjectId:string; name?:string; 
country?:string; dob?:string; docs?:string[]; wallets?:string[] }) { 
  // allowlist vigente → corto circuito 
  const allow = await prisma.allowlist.findFirst({ where: { subjectId: 
input.subjectId, expiresAt: { gt: new Date() }}}); 
  if (allow) { 
    const run = await saveRun(input, "clear", [], 0); 
    await prisma.subject.upsert({ where: { subjectId: input.subjectId 
}, update: { status: "clear", lastCheck: new Date(), reason: 
"allowlist" }, create: { subjectId: input.subjectId, status: "clear", 
lastCheck: new Date(), reason: "allowlist" }}); 
    return run; 
  } 
 
  const name = input.name ?? ""; 
  const wallets = (input.wallets ?? []).map(w => w.toLowerCase()); 
  const candidates = await prisma.watchlistItem.findMany({ 
    where: { 
      OR: [ 
        { name: { contains: name.split(" ")[0] ?? "" } }, 
        { aliases: { hasSome: name ? [name] : [] }}, 
        { wallet: { in: wallets.length ? wallets : ["__none__"] }} 
      ] 
    }, 
    take: 5000 
  }); 
 
  const hits:any[] = []; 
  let maxScore = 0; 
 
  for (const c of candidates) { 
    let score = 0; 
 
    if (name && c.kind !== "wallet") { 
      const s1 = winkler(name, c.name); 
      const s2 = Math.max(...(c.aliases ?? 
[]).map((a:string)=>winkler(name, a)), 0); 
      score += Math.max(s1, s2) * 0.75; 
    } 
    if (input.country && c.country && input.country.toUpperCase() === 
c.country.toUpperCase()) score += 0.1; 
    if (input.dob && c.dob && input.dob.slice(0,4) === 
c.dob.slice(0,4)) score += 0.15; 
    if (wallets.length && c.wallet && wallets.includes(c.wallet)) 
score = 1.0; // match exacto wallet → bloqueo 
 
    if (score >= 0.88 || (c.kind === "wallet" && score === 1.0)) { 
      hits.push({ 
        sourceKey: c.sourceKey, itemId: c.id, kind: c.kind, name: 
c.name, wallet: c.wallet, 
        score, fields: { dob: c.dob, country: c.country }, externalId: 
c.externalId 
      }); 
      if (score > maxScore) maxScore = score; 
    } 
  } 
 
  // Política de decisión 
  let decision: "clear" | "review" | "blocked" = "clear"; 
  if (hits.some(h => h.kind === "wallet" && h.score === 1.0)) decision 
= "blocked"; 
  else if (hits.some(h => h.score >= 0.94)) decision = "blocked"; // 
nombres muy fuertes 
  else if (hits.some(h => h.score >= 0.88)) decision = "review"; 
 
  const run = await saveRun(input, decision, hits, maxScore); 
 
  await prisma.subject.upsert({ 
    where: { subjectId: input.subjectId }, 
update: { status: decision, lastCheck: new Date(), reason: 
decision !== "clear" ? "watchlist_hit" : null }, 
create: { subjectId: input.subjectId, status: decision, lastCheck: 
new Date(), reason: decision !== "clear" ? "watchlist_hit" : null } 
}); 
if (decision === "blocked" || decision === "review") { 
for (const h of hits) { 
await prisma.blockReason.create({ data: { subjectId: 
input.subjectId, policy: h.kind === "wallet" ? "wallet_match" : 
"sanctions_match", sourceKey: h.sourceKey, itemId: h.itemId, score: 
h.score }}); 
} 
} 
return run; 
} 
async function saveRun(input:any, decision:"clear"|"review"|"blocked", 
hits:any[], scoreMax:number) { 
const payload = { input, hits, decision, at: new 
Date().toISOString() }; 
const eventHash = sha256(canonical(payload)); 
const run = await prisma.screeningRun.create({ 
data: { subjectId: input.subjectId, input, decision, scoreMax, 
evidence: { hits }, eventHash } 
}); 
return run; 
} 
function canonical(o:any){ return JSON.stringify(o, 
Object.keys(o).sort()); } 
function sha256(s:string){ return 
crypto.createHash("sha256").update(s).digest("hex"); } 
Anclaje por lotes (evidencia de bloqueo) 
