export type TagInput = { 
  subjectId?: string; 
  system: string;         // "postgres:core.users" 
  resourceType: string;   // "public.User" 
  resourceId: string;     // PK 
  dataCategory: string;   // email / ip / device_id / ... 
  purpose: string;        // marketing / analytics / ... 
  baseLegal: string;      // consent / legitimate_interest / ... 
  region?: string; 
}; 
 
export async function tagResource(apiBase: string, tag: TagInput) { 
  const r = await fetch(`${apiBase}/v1/retention/tags`, { 
method:"POST", headers:{"Content-Type":"application/json"}, body: 
JSON.stringify(tag) }); 
  if (!r.ok) throw new Error(`tagResource failed: ${r.status}`); 
  return r.json(); 
} 
 
export function minimizeObject<T extends object>(obj: T, 
allowedFields?: string[]): Partial<T> { 
if (!allowedFields) return obj; 
const out:any = {}; 
for (const k of allowedFields) if (k in obj) out[k] = (obj as 
any)[k]; 
return out; 
} 
Uso (ejemplo en creación de usuario) 
