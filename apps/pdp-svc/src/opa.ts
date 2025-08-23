// Consulta a OPA sidecar por REST local 
export async function opaQuery(path: string, input: unknown) { 
  const url = `${process.env.OPA_URL ?? 
"http://localhost:8181"}/v1/data/${path}`; 
  const r = await fetch(url, { 
    method: "POST", 
    headers: { "Content-Type":"application/json" }, 
    body: JSON.stringify({ input }) 
  }); 
  if (!r.ok) { 
    const t = await r.text(); 
    throw new Error(`OPA_ERROR ${r.status}: ${t}`); 
} 
return await r.json(); 
} 
