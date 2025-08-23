import fetch from "node-fetch"; 
import crypto from "crypto"; 
import { parseStringPromise } from "xml2js"; 
import Papa from "papaparse"; 
 
export async function fetchList(source: { key:string; url:string; 
format:"csv"|"json"|"xml"; etag?:string|null }) { 
  const r = await fetch(source.url, { headers: source.etag ? { 
"If-None-Match": source.etag } : {} }); 
  if (r.status === 304) return { notModified: true }; 
  const buf = Buffer.from(await r.arrayBuffer()); 
  const sha256 = 
crypto.createHash("sha256").update(buf).digest("hex"); 
  const etag = r.headers.get("etag") ?? undefined; 
 
  let items: any[] = []; 
  if (source.format === "json") { 
    const j = JSON.parse(buf.toString("utf8")); 
    items = Array.isArray(j) ? j : (j.items ?? []); 
  } else if (source.format === "xml") { 
    const xml = await parseStringPromise(buf.toString("utf8"), { 
explicitArray: false, mergeAttrs: true }); 
    items = extractFromXml(xml); 
  } else { // csv 
    const parsed = Papa.parse(buf.toString("utf8"), { header: true, 
skipEmptyLines: true }); 
    items = parsed.data as any[]; 
  } 
  return { etag, sha256, items }; 
} 
 
function extractFromXml(xml: any): any[] { 
  // Simplificación: intenta hallar nodos "ENTITY" típicos; ajustar 
por fuente 
  const flat: any[] = []; 
  JSON.stringify(xml, (_k, v) => { 
    if (v && typeof v === "object" && (v.Name || v.name)) 
flat.push(v); 
    return v; 
  }); 
return flat; 
} 
