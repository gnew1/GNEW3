import fs from "fs/promises"; 
import path from "path"; 
import yaml from "yaml"; 
import crypto from "crypto"; 
import { prisma } from "../infra/prisma"; 
 
type JxDoc = any; 
let cache: { doc: JxDoc, mtimeMs: number } | null = null; 
 
export async function loadDoc(): Promise<JxDoc> { 
  const p = path.join(process.cwd(), "config", "jx.rules.yaml"); 
  const stat = await fs.stat(p); 
  if (!cache || stat.mtimeMs !== cache.mtimeMs) { 
    const raw = await fs.readFile(p, "utf8"); 
    const doc = yaml.parse(raw); 
    cache = { doc, mtimeMs: stat.mtimeMs }; 
  } 
  return cache!.doc; 
} 
 
export async function versionString() { 
  const d = await loadDoc(); 
  return d.version as string; 
} 
 
type Input = { 
  country: string; 
  productType?: "digital"|"physical"|"financial"|"service"; 
  kycLevel?: "NONE"|"BASIC"|"STANDARD"|"ENHANCED"; 
  isPEP?: boolean; 
  sanctionsStatus?: "clear"|"review"|"blocked"; 
  amount?: number; 
  currency?: string; 
}; 
 
export async function resolveEffective(input: Input) { 
  const d = await loadDoc(); 
  const country = input.country.toUpperCase(); 
  const region = regionOf(country); 
  const product = input.productType ?? "digital"; 
 
  // Merge: defaults -> region -> country -> subdivision (si 
existiera) 
  const base = d.defaults; 
  const regionRule = d.rules.find((r:any)=> r.match?.region === 
region) || {}; 
  const countryRule = d.rules.find((r:any)=> r.match?.country === 
country) || {}; 
  const merged = deepMerge(base, regionRule, countryRule); 
 
  // Taxes 
  const ptDef  = merged.taxes?.product_type_defaults ?? {}; 
  const ptOv   = merged.taxes?.product_type_overrides?.[product] ?? 
{}; 
  const vatApplicable = pick(ptOv, ptDef, "vat_applicable", true); 
  const vatRate = pick(ptOv, ptDef, "vat_rate", 0); 
  const reverseCharge = pick(ptOv, ptDef, "reverse_charge", false); 
 
  // KYC/Limits 
  const kycLevels = merged.kyc?.levels ?? base.kyc.levels; 
  const kycReqs   = merged.kyc?.requirements ?? base.kyc.requirements; 
  const limits    = merged.limits?.per_level ?? base.limits.per_level; 
  const level = input.kycLevel ?? "NONE"; 
  const lim = limits[level]; 
 
  // Risk/embargo 
  const embargo = (d.embargo_countries ?? []).includes(country); 
  const risk = { 
    pep: (d.defaults?.risk?.pep_requires ?? "REVIEW"), 
    sanctioned: (d.defaults?.risk?.sanctioned_requires ?? "BLOCK") 
  }; 
 
  const out = { 
    version: d.version, 
    tax: { vatApplicable, vatRate, reverseCharge, product }, 
    kyc: { levels: kycLevels, requirements: kycReqs[level] ?? [], 
level }, 
    limits: { ...lim }, 
    embargo, 
    risk 
  }; 
  return out; 
} 
 
function regionOf(country: string): string { 
  // Mapa simple; en producción usar ISO y catálogo real 
  const EU = 
["ES","FR","DE","NL","PT","IT","IE","BE","AT","FI","SE","DK","CZ","PL"
 ,"HU","RO","SK","SI","HR","EE","LV","LT","LU","MT","BG","CY","EL"]; 
  if (EU.includes(country)) return "EU"; 
  if (country === "UK") return "UK"; 
  if (country === "US") return "US"; 
  if (country === "BR") return "LATAM"; 
  if (country === "MX") return "LATAM"; 
  return "ROW"; 
} 
 
function deepMerge(...layers: any[]) { 
  const out: any = {}; 
  for (const layer of layers) { 
    const l = layer?.taxes || layer?.kyc || layer?.limits ? layer : 
{}; // rule node or defaults 
    mergeInto(out, layer?.taxes ? { taxes: layer.taxes } : {}); 
    mergeInto(out, layer?.kyc ? { kyc: layer.kyc } : {}); 
    mergeInto(out, layer?.limits ? { limits: layer.limits } : {}); 
    if (layer?.taxes?.product_type_overrides) { 
      out.taxes = out.taxes || {}; 
      out.taxes.product_type_overrides = { 
...(out.taxes.product_type_overrides||{}), 
...layer.taxes.product_type_overrides }; 
    } 
    if (layer?.taxes?.product_type_defaults) { 
      out.taxes = out.taxes || {}; 
      out.taxes.product_type_defaults = { 
...(out.taxes.product_type_defaults||{}), 
...layer.taxes.product_type_defaults }; 
    } 
    if (layer?.kyc?.requirements) { 
      out.kyc = out.kyc || {}; 
      out.kyc.requirements = { ...(out.kyc.requirements||{}), 
...layer.kyc.requirements }; 
    } 
    if (layer?.limits?.per_level) { 
      out.limits = out.limits || {}; 
      out.limits.per_level = { ...(out.limits.per_level||{}), 
...layer.limits.per_level }; 
    } 
  } 
  return out; 
} 
function mergeInto(a:any, b:any){ for (const k of Object.keys(b)) a[k] 
= { ...(a[k]||{}), ...(b[k]||{}) }; } 
function pick(ov:any, def:any, key:string, fallback:any){ return 
(ov?.[key] ?? def?.[key] ?? fallback); } 
 
export async function listCoverage() { 
  const items = await prisma.coverageCountry.findMany({ orderBy: { 
code: "asc" }}); 
return items; 
} 
export async function recordDecision(input:any, output:any) { 
const version = await versionString(); 
const payload = { version, input, output, at: new 
Date().toISOString() }; 
const eventHash = 
crypto.createHash("sha256").update(JSON.stringify(payload)).digest("he
 x"); 
const ev = await prisma.jurisdictionDecision.create({ data: { 
version, input, output, eventHash }}); 
return ev; 
} 
