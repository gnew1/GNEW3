"use client"; 
import React, { useEffect, useState } from "react"; 
 
type Req = { 
  id:string; subjectId:string; type:string; status:string; 
dueAt:string; createdAt:string; 
} 
 
export default function DSARAdminPage() { 
  const [rows, setRows] = useState<Req[]>([]); 
  const [sel, setSel] = useState<Req|null>(null); 
 
  const load = async () => { 
    const r = await fetch("/api/dsar/requests"); 
    const j = await r.json(); setRows(j.items); 
  }; 
  useEffect(()=>{ load(); }, []); 
 
  return ( 
    <div className="p-6 space-y-6"> 
      <h1 className="text-2xl font-semibold">DSAR Console</h1> 
      <table className="w-full"> 
        <thead>
          <tr>
            <th className="text-left">ID</th>
            <th>Sujeto</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Vence</th>
            <th></th>
          </tr>
        </thead> 
        <tbody> 
          {rows.map(r=>( 
            <tr key={r.id} className="border-t"> 
              <td className="py-2">{r.id.slice(0,8)}</td> 
              <td>{r.subjectId}</td> 
              <td>{r.type}</td> 
              <td>{r.status}</td> 
              <td>{new Date(r.dueAt).toLocaleDateString()}</td> 
              <td>
                <button
                  className="px-2 py-1 border rounded"
                  onClick={async () => {
                    const d = await fetch(`/api/dsar/requests/${r.id}`).then(r=>r.json());
                    setSel(d);
                  }}
                >
                  Ver
                </button>
              </td> 
            </tr> 
          ))} 
        </tbody> 
      </table> 
 
      {sel && ( 
        <div className="p-4 border rounded space-y-3"> 
          <div className="flex items-center justify-between"> 
            <h2 className="text-xl font-medium">Solicitud {sel.id}</h2> 
            <span className="text-sm text-gray-500">{sel.status}</span> 
          </div> 
          <div className="flex gap-2"> 
            <button
              className="px-3 py-2 border rounded"
              onClick={() => fetch(`/api/dsar/requests/${sel.id}/verify`, { method: "POST" }).then(load)}
            >
              Verificar
            </button> 
            <button
              className="px-3 py-2 border rounded"
              onClick={() => fetch(`/api/dsar/requests/${sel.id}/approve`, { method: "POST" }).then(load)}
            >
              Aprobar
            </button> 
            <button
              className="px-3 py-2 border rounded"
              onClick={() => fetch(`/api/dsar/requests/${sel.id}/export`, { method: "POST" }).then(load)}
            >
              Export
            </button> 
            <button
              className="px-3 py-2 border rounded"
              onClick={() => fetch(`/api/dsar/requests/${sel.id}/erase`, { method: "POST" }).then(load)}
            >
              Borrar/Anon
            </button> 
          </div> 
          <div> 
            <h3 className="font-semibold">Artefactos</h3> 
            <Artifacts id={sel.id}/> 
          </div> 
        </div> 
      )} 
    </div> 
  ); 
} 
 
function Artifacts({ id }: { id: string }) { 
  const [items, setItems] = React.useState<any[]>([]); 
  useEffect(()=>{ 
    fetch(`/api/dsar/requests/${id}/artifacts`)
      .then(r=>r.json())
      .then(j=> setItems(j.items));
  }, [id]); 
  return ( 
    <ul className="list-disc pl-6"> 
      {items.map(a=>( 
        <li key={a.id}> 
          {a.name} — {a.sha256.slice(0,12)}… 
          <a
            className="ml-2 underline"
            href={`/files?path=${encodeURIComponent(a.path)}`}
            target="_blank"
          >
            Descargar
          </a> 
        </li> 
      ))} 
    </ul> 
  ); 
} 
 
