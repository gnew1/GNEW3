import React, { useState } from "react"; 
 
export default function AppealForm({ address, epoch, version }: Readonly<{
address:string; epoch:number; version:number }>) {
  const [category, setCategory] = useState("dato_incorrecto"); 
  const [desc, setDesc] = useState(""); 
  const [link, setLink] = useState(""); 
  const [sent, setSent] = useState(false); 
 
  async function onSubmit() { 
    const r = await fetch("/api/reputation/appeal", { 
      method:"POST", headers:{ "content-type": "application/json" }, 
      body: JSON.stringify({ address, epoch, version, category, 
description: desc, attachmentUrl: link }) 
    }); 
    if (r.ok) setSent(true); 
  } 
 
  return ( 
    <div className="rounded-2xl border p-4"> 
      <div className="font-semibold mb-2">¿Ves un error? Envía una 
corrección/appeal</div> 
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> 
        <div> 
          <label className="block text-xs text-gray-500 
mb-1">Categoría</label> 
          <select className="border rounded-xl px-3 py-2 w-full" 
value={category} onChange={e=>setCategory(e.target.value)}> 
            <option value="dato_incorrecto">Dato incorrecto</option> 
            <option value="atribucion">Atribución errónea</option> 
            <option value="spam_penalty">Penalización injusta</option> 
            <option value="otro">Otro</option> 
          </select> 
        </div> 
        <div> 
          <label className="block text-xs text-gray-500 mb-1">Adjunto 
(URL)</label> 
          <input className="border rounded-xl px-3 py-2 w-full" 
placeholder="ipfs://... o https://..." value={link} 
onChange={e=>setLink(e.target.value)} /> 
        </div> 
      </div> 
      <label className="block text-xs text-gray-500 mt-3 
mb-1">Describe el problema</label> 
      <textarea className="border rounded-xl w-full p-3 h-28 text-sm" 
value={desc} onChange={e=>setDesc(e.target.value)} /> 
      <div className="mt-3"> 
        <button className="px-4 py-2 rounded-xl bg-black text-white" 
onClick={onSubmit}>Enviar</button> 
        {sent && <span className="ml-3 text-sm 
text-emerald-600">Recibido. Te notificaremos el resultado.</span>} 
      </div> 
      <p className="text-xs text-gray-500 mt-2">El appeal no reduce tu 
score automáticamente; será revisado por el equipo y/o un proceso 
automático.</p> 
    </div> 
  ); 
} 
 
 
