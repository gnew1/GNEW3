import React, { useEffect, useState } from "react"; 
 
type PanelData = { 
  thread_id: number; 
  title: string; 
  tldr: string; 
  key_arguments: string[]; 
  tags: string[]; 
  agenda: string[]; 
  sources: string[]; 
}; 
 
export function DebatePanel({ 
  apiBase = "/debate-assistant", 
  threadId, 
}: { 
  apiBase?: string; 
  threadId: number; 
}) { 
  const [data, setData] = useState<PanelData | null>(null); 
  const [loading, setLoading] = useState(true); 
  const [err, setErr] = useState<string | null>(null); 
 
  useEffect(() => { 
    let mounted = true; 
    (async () => { 
      try { 
        setLoading(true); 
        const res = await fetch(`${apiBase}/panel/${threadId}`); 
        if (!res.ok) throw new Error("failed"); 
        const json = await res.json(); 
        if (mounted) setData(json); 
      } catch (e) { 
        setErr("No se pudo cargar el panel"); 
      } finally { 
        setLoading(false); 
      } 
    })(); 
    return () => { 
      mounted = false; 
    }; 
  }, [threadId, apiBase]); 
 
  if (loading) return <div>Generando TL;DR…</div>; 
  if (err) return <div role="alert">{err}</div>; 
  if (!data) return null; 
 
  return ( 
    <div className="max-w-4xl mx-auto space-y-6"> 
      <header> 
        <h2 className="text-xl font-semibold">TL;DR</h2> 
        <p className="mt-2 leading-relaxed">{data.tldr}</p> 
      </header> 
 
      <section> 
        <h3 className="font-semibold">Argumentos clave</h3> 
        <ol className="list-decimal list-inside space-y-2">
          {data.key_arguments.map((a) => (
            <li key={a} className="bg-gray-50 rounded p-3">{a}</li>
          ))}
        </ol>
      </section>
 
      <section> 
        <h3 className="font-semibold">Etiquetas</h3> 
        <div className="flex flex-wrap gap-2">
          {data.tags.map((t) => (
            <span key={t} className="px-2 py-1 rounded-full text-sm border">{t}</span>
          ))}
        </div>
      </section>
 
      <section> 
        <h3 className="font-semibold">Agenda sugerida</h3> 
        {data.agenda.length ? ( 
          <ul className="list-disc list-inside space-y-1">
            {data.agenda.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Sin acciones 
detectadas.</p> 
        )} 
      </section> 
    </div> 
  ); 
} 
 
 
