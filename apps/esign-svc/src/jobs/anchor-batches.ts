// (Opcional) si se quisiera anclar por lotes múltiples sobres 
completados recientemente. 
// En este N138 ya anclamos al completar. Este job serviría como 
reintento si falló el envío on-chain. 
 
/apps/web/app/sign/[token]/page.tsx 
"use client"; 
import { useState } from "react"; 
 
export default function SignPage({ params }:{ params:{ token:string } 
}) { 
  const [sig, setSig] = useState<string>(""); 
  const [done, setDone] = useState<any>(null); 
  async function submit() { 
    const r = await fetch(`/api/esign/sign/${params.token}`, { 
      method: "POST", headers: { "Content-Type":"application/json" }, 
      body: JSON.stringify({ signatureImg: sig }) 
    }); 
    const j = await r.json(); setDone(j); 
  } 
  return ( 
    <div className="min-h-screen flex items-center justify-center 
p-6"> 
      <div className="max-w-xl w-full space-y-4"> 
        <h1 className="text-xl font-semibold">Firma electrónica</h1> 
        <p className="text-sm text-gray-600">Al firmar aceptas el 
contenido del documento. Tu firma y metadatos quedarán auditados.</p> 
        <SignaturePad onChange={setSig}/> 
        <button className="px-4 py-2 bg-black text-white rounded" 
onClick={submit}>Firmar</button> 
        {done && <pre className="bg-gray-50 p-3 text-xs 
rounded">{JSON.stringify(done,null,2)}</pre>} 
      </div> 
    </div> 
  ); 
} 
 
function SignaturePad({ onChange }:{ onChange:(dataUrl:string)=>void 
}) { 
  // simplistic: input tipo file para base64; en prod usar canvas 
  return ( 
    <div className="space-y-2"> 
      <label className="text-sm">Sube PNG de tu firma 
(opcional)</label> 
      <input type="file" accept="image/png" onChange={async (e)=>{ 
        const f = e.target.files?.[0]; if (!f) return; 
        const b = await f.arrayBuffer(); const b64 = 
`data:image/png;base64,${Buffer.from(b).toString("base64")}`; 
        onChange(b64); 
      }}/> 
    </div> 
  ); 
} 
 
/apps/web/pages/api/esign/sign/[token].ts 
import type { NextApiRequest, NextApiResponse } from "next"; 
export default async function 
handler(req:NextApiRequest,res:NextApiResponse){ 
  const r = await 
fetch(`${process.env.ESIGN_API}/v1/envelopes/sign/${req.query.token}`, 
{ 
    method: "POST", headers: { "Content-Type":"application/json" }, 
body: JSON.stringify(req.body || {}) 
  }); 
  res.status(r.status).send(await r.text()); 
} 
 
