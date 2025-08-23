export type AccessInput = any; 
export type PaymentsInput = any; 
 
async function callPDP(path:string, body:any) { 
  const r = await fetch(`${process.env.PDP_API}/v1/policy/${path}`, { 
    method: "POST", 
    headers: { "Content-Type":"application/json" }, 
    body: JSON.stringify(body) 
  }); 
  const j = await r.json(); 
  if (!r.ok) throw new Error(j.error || "PDP_ERROR"); 
  return j; 
} 
 
export async function decideAccess(input: AccessInput) { 
  return await callPDP("access:decide", input) as { allow:boolean; 
reason?:string; obligations?:string[] }; 
} 
export async function decidePayment(input: PaymentsInput) { 
  return await callPDP("payments:decide", input) as { allow:boolean; 
reason?:string; obligations?:string[] }; 
} 
 
