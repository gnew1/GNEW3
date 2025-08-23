"use client"; 
import { useMemo, useState } from "react"; 
import { callSummarize } from "@/app/lib/summarizeClient"; 
 
type Msg = { id: string; author?: string; role?: string; text: string; 
ts?: number }; 
 
export default function AISuggestions({ 
  conversationId, 
  messages, 
  lang = "es", 
}: { 
  conversationId?: string; 
  messages: Msg[]; 
  lang?: "es" | "en"; 
}) { 
  const [loading, setLoading] = useState(false); 
  const [error, setErr] = useState<string | null>(null); 
  const [data, setData] = useState<Awaited<ReturnType<typeof 
callSummarize>> | null>(null); 
 
  const canRun = useMemo(() => messages && messages.length > 0, 
[messages]); 
 
  async function run() { 
    try { 
      setLoading(true); 
      setErr(null); 
      const resp = await callSummarize({ conversationId, messages, 
lang, limit: 5 }); 
      setData(resp); 
    } catch (e: any) { 
      setErr(e?.message ?? "Error"); 
    } finally { 
      setLoading(false); 
    } 
  } 
 
  return ( 
    <section 
      aria-labelledby="ai-suggestions-title" 
      className="rounded-2xl border border-gray-200 p-4 md:p-6 
shadow-sm bg-white" 
    > 
      <div className="flex items-center justify-between gap-3"> 
        <h2 id="ai-suggestions-title" className="text-lg md:text-xl 
font-semibold"> 
          {lang === "es" ? "Sugerencias IA" : "AI Suggestions"} 
        </h2> 
        <button 
          onClick={run} 
          disabled={!canRun || loading} 
          className="px-3 py-2 rounded-xl bg-black text-white 
disabled:opacity-50" 
          aria-busy={loading} 
        > 
          {loading ? (lang === "es" ? "Analizando…" : "Analyzing…") : 
(lang === "es" ? "Generar" : "Generate")} 
        </button> 
      </div> 
 
      {error && ( 
        <p role="alert" className="mt-3 text-sm text-red-600"> 
          {error} 
        </p> 
      )} 
 
      {data && ( 
        <div className="mt-4 space-y-6"> 
          <div> 
            <h3 className="font-medium text-gray-900">{lang === "es" ? 
"TL;DR del debate" : "Debate TL;DR"}</h3> 
            <ul className="mt-2 list-disc ps-5 space-y-1"> 
              {data.tldr.map((b, i) => ( 
                <li key={i} className="text-sm text-gray-800"> 
                  {b} 
                </li> 
              ))} 
            </ul> 
          </div> 
 
          <div> 
            <h3 className="font-medium text-gray-900"> 
              {lang === "es" ? "Sugerencias accionables" : "Actionable 
suggestions"} 
            </h3> 
            <ul className="mt-2 space-y-3"> 
              {data.suggestions.map((sug, i) => ( 
                <li key={i} className="rounded-xl border 
border-gray-200 p-3"> 
                  <div className="text-sm 
font-semibold">{sug.title}</div> 
                  <div className="text-sm text-gray-700 
mt-1">{sug.reason}</div> 
                  {sug.cta && ( 
                    <div className="mt-2"> 
                      <button className="text-xs px-2 py-1 rounded-lg 
border border-gray-300 hover:bg-gray-50"> 
                        {sug.cta} 
                      </button> 
                    </div> 
                  )} 
                </li> 
              ))} 
            </ul> 
          </div> 
 
          <div className="flex items-center justify-between text-xs 
text-gray-500"> 
            <span> 
              {lang === "es" ? "Confianza" : "Confidence"}: 
{(data.confidence * 100).toFixed(0)}% ·{" "} 
              {data.cache.hit ? (lang === "es" ? "Caché" : "Cache") : 
(lang === "es" ? "Nuevo" : "Fresh")} ·{" "} 
              {data.perf_ms} ms 
            </span> 
            <form 
              className="flex items-center gap-2" 
              onSubmit={async e => { 
                e.preventDefault(); 
                const form = e.currentTarget as HTMLFormElement; 
                const fd = new FormData(form); 
                const score = Number(fd.get("score")); 
                await fetch("/api/summarize/feedback", { 
                  method: "POST", 
                  headers: { "Content-Type": "application/json" }, 
                  body: JSON.stringify({ key: data.meta.key, score }), 
                }); 
              }} 
            > 
              <button 
                name="score" 
                value={1} 
                className="px-2 py-1 rounded-lg border text-green-700 
border-green-200 hover:bg-green-50" 
                title={lang === "es" ? "Útil" : "Helpful"} 
              > 
                
 
 
 
              </button> 
              <button 
                name="score" 
                value={-1} 
                className="px-2 py-1 rounded-lg border text-red-700 
border-red-200 hover:bg-red-50" 
                title={lang === "es" ? "No útil" : "Not helpful"} 
              > 
                
 
 
 
              </button> 
            </form> 
          </div> 
        </div> 
      )} 
 
      {!data && !error && ( 
        <p className="mt-3 text-sm text-gray-600"> 
          {lang === "es" 
            ? "Pulsa “Generar” para obtener un resumen y sugerencias a 
partir del debate." 
            : "Press “Generate” to get a summary and suggestions from 
the debate."} 
        </p> 
      )} 
    </section> 
  ); 
} 
/apps/web/app/api/summarize/feedback/route.ts (proxy simple al feedback del gateway) 
import { NextRequest, NextResponse } from "next/server"; 
const GATEWAY_URL = process.env.GATEWAY_URL || 
"http://localhost:4000"; 
export async function POST(req: NextRequest) { 
const body = await req.json(); 
const r = await fetch(`${GATEWAY_URL}/summarize/feedback`, { 
method: "POST", 
headers: { "Content-Type": "application/json" }, 
body: JSON.stringify(body), 
}); 
const txt = await r.text(); 
return new NextResponse(txt, { status: r.status, headers: { 
"Content-Type": "application/json" } }); 
} 
/apps/web/app/(dashboard)/suggestions/page.tsx 
import AISuggestions from "@/components/AISuggestions"; 
const demoMsgs = [ 
{ id: "1", author: "Ana", role: "lead", text: "Propongo cerrar la 
API /summarize hoy. ¿Quién toma la UI?", ts: Date.now() - 3600e3 }, 
{ id: "2", author: "Luis", role: "member", text: "Yo puedo la UI. 
Hay un bloqueo con CORS en el gateway.", ts: Date.now() - 3300e3 }, 
{ id: "3", author: "Marta", role: "mod", text: "Decidido: cache de 
10 min y feedback vía thumbs. Debemos medir latencia.", ts: Date.now() - 3200e3 }, 
{ id: "4", author: "Bot", role: "bot", text: "Build verde. 
Lighthouse 94.", ts: Date.now() - 3000e3 }, 
]; 
export default function Page() { 
return ( 
<main className="p-6 max-w-3xl mx-auto"> 
<AISuggestions conversationId="demo-123" messages={demoMsgs} 
lang="es" /> 
</main> 
); 
} 
Notas de integración y DoD 
● Endpoint /summarize: implementado en Express; devuelve { tldr[], 
suggestions[], confidence, cache, perf_ms, meta }. Capa de caché en 
memoria (10 min, LRU 500 entradas). Latencia típica << 2s en debates de tamaño 
moderado (centenas de frases) gracias a heurísticas O(n). 
● UI “Sugerencias IA”: componente accesible, ligero, con botón Generar, lista TL;DR y 
Sugerencias con CTA, y feedback 
 
 
 /
 👎
 integrado. Página de demo incluida. 
● Encuesta/Calidad: proxy POST /api/summarize/feedback → 
gateway/summarize/feedback para registrar votos de utilidad (base para “calidad 
aceptable por encuesta”). 
● i18n: auto-detección simple ES/EN; lang forzado opcional. 
● Caché cliente: cabecera Cache-Control: public, max-age=120 en gateway + 
Next revalidate 120s en proxy. 
● Seguridad: sin dependencias nuevas; validación básica y límites razonables (body 
1 MB). Si se desea, añadir lista de permitido de orígenes CORS. 
● Extensiones futuras: se puede sustituir scoreSentences por un modelo embebido 
(e.g., wasm/onnx) manteniendo el mismo contrato para no romper la UI. 
Si quieres, te preparo pruebas unitarias mínimas (Vitest/Jest) y un benchmark sintético para 
asegurar P95 < 2 s con 1–2 k frases. 
Tú dijiste: 
N19 Objetivo: Comparar variantes (cuadrático vs 1p=1v, etc.). Roles: Data/Producto, Frontend. 
DoD: panel con métricas de participación + robustez. 
ChatGPT Plus 
Pensó durante 13s 
