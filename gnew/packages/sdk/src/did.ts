export type CreateDidRequest = { 
  method: "gnew" | "key" | "pkh"; 
  controllerPrivKey?: string; 
  chainId?: number; 
  services?: { id: string; type: string; serviceEndpoint: string }[]; 
  alsoAnchor?: boolean; 
  storage?: "ipfs" | "ceramic" | "inline"; 
}; 
 
export async function createDID(apiBase: string, req: 
CreateDidRequest) { 
  const r = await fetch(`${apiBase}/v1/dids`, { 
    method: "POST", 
    headers: { "content-type": "application/json" }, 
    body: JSON.stringify(req) 
  }); 
  if (!r.ok) throw new Error(await r.text()); 
  return r.json(); 
} 
 
export async function resolveDID(apiBase: string, did: string) { 
  const r = await 
fetch(`${apiBase}/v1/dids/${encodeURIComponent(did)}`); 
  if (!r.ok) throw new Error(await r.text()); 
  return r.json(); 
} 
 
export async function updateDID(apiBase: string, did: string, ops: 
any, controllerPrivKey: string) { 
  const r = await 
fetch(`${apiBase}/v1/dids/${encodeURIComponent(did)}`, { 
    method: "PATCH", 
    headers: { "content-type": "application/json", "authorization": 
`Bearer ${controllerPrivKey}` }, 
    body: JSON.stringify(ops) 
  }); 
  if (!r.ok) throw new Error(await r.text()); 
  return r.json(); 
} 
 
export async function deactivateDID(apiBase: string, did: string, 
controllerPrivKey: string) { 
  const r = await 
fetch(`${apiBase}/v1/dids/${encodeURIComponent(did)}`, { 
    method: "DELETE", 
    headers: { "authorization": `Bearer ${controllerPrivKey}` } 
  }); 
  if (!r.ok) throw new Error(await r.text()); 
  return r.json(); 
} 
 
 
