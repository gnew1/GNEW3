export type ResolveInput = { 
  country: string; productType: 
"digital"|"physical"|"financial"|"service"; 
  kycLevel?: "NONE"|"BASIC"|"STANDARD"|"ENHANCED"; 
  isPEP?: boolean; sanctionsStatus?: "clear"|"review"|"blocked"; 
  amount?: number; currency?: string; 
}; 
export async function jxResolve(apiBase:string, input:ResolveInput){ 
  const r = await fetch(`${apiBase}/v1/jx/resolve`, { method:"POST", 
headers:{ "Content-Type":"application/json" }, body: 
JSON.stringify(input) }); 
  if (!r.ok) throw new Error(`JX_ERROR ${r.status}`); 
  return r.json(); 
} 
 
