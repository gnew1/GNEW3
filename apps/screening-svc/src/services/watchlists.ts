import fs from "fs/promises"; 
import path from "path"; 
import yaml from "yaml"; 
import { prisma } from "../infra/prisma"; 
import { fetchList } from 
"../../../packages/screening-connectors/src/http"; 
type SourceCfg = { key:string; kind:string; format:"csv"|"json"|"xml"; 
url:string; etag_header?:string; }; 
export async function refreshAll() { 
const cfg = await loadCfg(); 
for (const s of cfg.sources as SourceCfg[]) { 
await refreshOne(s); 
} 
} 
async function loadCfg() { 
const p = path.join(process.cwd(), "config", "watchlists.yaml"); 
const text = await fs.readFile(p, "utf8"); 
return yaml.parse(text); 
} 
async function refreshOne(s: SourceCfg) { 
const prev = await prisma.watchlistSource.findUnique({ where: { key: 
s.key }}); 
const out = await fetchList({ key: s.key, url: s.url, format: 
s.format, etag: prev?.etag ?? null as any }); 
if ((out as any).notModified) return; 
const norm = normalize(s.key, out.items); 
await prisma.$transaction(async (tx) => { 
await tx.watchlistItem.deleteMany({ where: { sourceKey: s.key }}); 
for (const it of norm) await tx.watchlistItem.create({ data: it 
}); 
await tx.watchlistSource.upsert({ 
      where: { key: s.key }, 
      update: { version: Date.now().toString(), format: s.format, url: 
s.url, etag: out.etag, sha256: out.sha256, fetchedAt: new Date(), 
items: norm.length }, 
      create: { key: s.key, version: Date.now().toString(), format: 
s.format, url: s.url, etag: out.etag, sha256: out.sha256, fetchedAt: 
new Date(), items: norm.length } 
    }); 
  }); 
} 
 
function normalize(sourceKey: string, items: any[]) { 
  return items.map((raw) => { 
    const name = (raw.name ?? raw.Name ?? raw.Surname ?? raw.fullname 
?? "").toString().trim(); 
    const aliases = collectAliases(raw); 
    const dob = (raw.dob ?? raw.DOB ?? raw.DateOfBirth ?? 
"").toString().slice(0, 10); 
    const country = (raw.country ?? raw.Country ?? raw.Nationality ?? 
"").toString().slice(0, 2).toUpperCase(); 
    const extId = (raw.uid ?? raw.id ?? raw.EntityID ?? 
null)?.toString() ?? null; 
    const wallet = (raw.wallet ?? raw.Address ?? raw.CryptoAddress ?? 
"").toString().toLowerCase().trim() || null; 
    const kind = wallet ? "wallet" : (raw.entity_type ?? raw.type ?? 
"person").toString().toLowerCase(); 
    return { 
      sourceKey, externalId: extId, kind, name, 
      aliases, dob: dob || null, country: country || null, docId: 
(raw.passport ?? raw.doc ?? null), 
      wallet, raw 
    }; 
  }); 
} 
function collectAliases(raw:any): string[] { 
  const alt = raw.aliases ?? raw.Aliases ?? raw.AKA ?? []; 
  if (typeof alt === "string") return 
alt.split(/[;|,]/).map((s)=>s.trim()).filter(Boolean); 
  if (Array.isArray(alt)) return 
alt.map((x)=>String(x).trim()).filter(Boolean); 
  return []; 
} 
 
 
Motor de matching y decisión 
