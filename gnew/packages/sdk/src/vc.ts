/** 
 * SDK cliente para VCs (emitir, presentar, verificar local) 
 */ 
export type IssueOptions = { 
  type: "role" | "achievement"; 
  method: "sd-jwt" | "bbs"; 
  issuerDid: string; 
  issuerPrivKey: string; 
  subjectDid: string; 
  claims: any; 
  listName?: string; 
}; 
 
export async function issueVC(apiBase: string, opts: IssueOptions) { 
  const r = await fetch(`${apiBase}/v1/vc/issue`, { 
    method: "POST", 
    headers: { "content-type": "application/json" }, 
    body: JSON.stringify(opts) 
  }); 
  if (!r.ok) throw new Error(await r.text()); 
  return r.json(); 
} 
 
export async function verifyPresentationLocal(apiBase: string, 
payload: any) { 
  const r = await fetch(`${apiBase}/v1/vp/verify`, { 
    method: "POST", 
    headers: { "content-type": "application/json" }, 
    body: JSON.stringify(payload) 
  }); 
  if (!r.ok) throw new Error(await r.text()); 
  return r.json(); 
} 
 
export async function revokeIndex(apiBase: string, listName: string, 
index: number) { 
  const r = await fetch(`${apiBase}/v1/status/revoke`, { 
    method: "POST", 
    headers: { "content-type": "application/json" }, 
    body: JSON.stringify({ listName, index }) 
  }); 
  if (!r.ok) throw new Error(await r.text()); 
  return r.json(); 
} 
 
 
