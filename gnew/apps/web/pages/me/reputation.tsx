import React, { useEffect, useMemo, useState } from "react"; 
import ScoreCard from "@/components/reputation/ScoreCard"; 
import BreakdownTable from "@/components/reputation/BreakdownTable"; 
import DecayTimeline from "@/components/reputation/DecayTimeline"; 
import WhatIfSimulator from "@/components/reputation/WhatIfSimulator"; 
import AppealForm from "@/components/reputation/AppealForm"; 
 
type ScoreItem = { kind:string; ts:number; val:number; contrib:number; 
mult:Record<string,number> }; 
type MeScore = { 
  address: string; 
  epoch: number; 
  version: number; 
  score: number; 
  band?: string; 
  items: ScoreItem[]; 
  proof?: { leaf: { user:string; scoreMilli:number; version:number }, 
merkleRoot: string, proof: string[] }; 
}; 
 
export default function MyReputationPage() { 
  const [addr, setAddr] = useState<string>(""); 
  const [data, setData] = useState<MeScore|null>(null); 
  const [loading, setLoading] = useState(false); 
 
  async function fetchMe() { 
    if (!addr) return; 
    setLoading(true); 
    const r = await fetch(`/api/reputation/me?address=${addr}`); 
    const d = await r.json(); 
    setData(d); 
    setLoading(false); 
  } 
 
  useEffect(()=>{ /* opcional: autocompletar con wallet conectada */ 
},[]); 
 
  const top5 = useMemo(()=> data ? 
[...data.items].sort((a,b)=>b.contrib-a.contrib).slice(0,5) : [], 
[data]); 
 
  return ( 
    <div className="max-w-6xl mx-auto p-6 space-y-6"> 
      <h1 className="text-2xl font-bold">Mi reputación</h1> 
      <div className="flex gap-2"> 
        <input className="border rounded-xl px-3 py-2 w-full" 
placeholder="Tu dirección 0x..." value={addr} 
onChange={e=>setAddr(e.target.value)} /> 
        <button className="px-4 py-2 rounded-xl bg-black text-white" 
onClick={fetchMe} disabled={loading}> 
          {loading ? "Cargando..." : "Ver"} 
        </button> 
      </div> 
 
      {data && ( 
        <> 
          <ScoreCard score={data.score} band={data.band} 
items={data.items.map(i=>({ kind:i.kind, contrib:i.contrib, ts:i.ts, 
mult:i.mult }))} /> 
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6"> 
            <div className="lg:col-span-2"> 
              <BreakdownTable items={data.items} /> 
            </div> 
            <div className=""> 
              <div className="rounded-2xl border p-4"> 
                <div className="font-semibold mb-2">Verificación</div> 
                <p className="text-sm text-gray-600"> 
                  Esta puntuación está anclada on‑chain (Merkle root). 
Puedes verificar las pruebas con un click. 
                </p> 
                <VerifyBox proof={data.proof} /> 
              </div> 
            </div> 
          </section> 
 
          <DecayTimeline items={data.items} /> 
 
          <WhatIfSimulator baseScore={data.score} items={data.items} 
/> 
 
          <AppealForm address={data.address} epoch={data.epoch} 
version={data.version} /> 
        </> 
      )} 
    </div> 
  ); 
} 
 
function VerifyBox({ proof }:{ proof?: MeScore["proof"] }) { 
  const [ok,setOk] = useState<boolean|null>(null); 
  async function onVerify() { 
    try { 
      const r = await fetch("/api/reputation/verify", { 
        method:"POST", headers:{ "content-type":"application/json" }, 
body: JSON.stringify(proof) 
      }); 
      const { ok } = await r.json(); setOk(ok); 
    } catch { setOk(false); } 
  } 
  return ( 
    <div> 
      <button onClick={onVerify} className="mt-2 px-4 py-2 rounded-xl 
bg-emerald-600 text-white">Verificar prueba</button> 
      {ok!==null && <div className={`mt-2 text-sm 
${ok?"text-emerald-600":"text-rose-600"}`}>{ok?"Prueba válida":"Prueba 
inválida"}</div>} 
    </div> 
  ); 
} 
 
 
/gnew/apps/web/components/reputation/BreakdownTable.
 tsx 
import React, { useMemo } from "react"; 
type Item = { kind:string; ts:number; val:number; contrib:number; 
mult:Record<string,number> }; 
 
export default function BreakdownTable({ items }:{ items: Item[] }) { 
  const sorted = useMemo(()=> 
[...items].sort((a,b)=>b.contrib-a.contrib), [items]); 
  const head = 
["Factor","Contribución","+/-","Velocidad","Diversidad","Colusión","Ca
 lidad","Identidad","Decaimiento","Fecha"]; 
  return ( 
    <div className="rounded-2xl border p-4"> 
      <div className="font-semibold mb-2">Explicación de 
factores</div> 
      <table className="w-full text-sm"> 
        <thead><tr className="text-left 
text-gray-500">{head.map(h=><th key={h} 
className="py-2">{h}</th>)}</tr></thead> 
        <tbody> 
          {sorted.map((i,idx)=>( 
            <tr key={idx} className="border-t"> 
              <td className="py-2 font-medium">{label(i.kind)}</td> 
              <td className="py-2 
font-semibold">+{i.contrib.toFixed(2)}</td> 
              <td className="py-2">{i.val}</td> 
              <td className="py-2">{fmt(i.mult.p_vel)}</td> 
              <td className="py-2">{fmt(i.mult.p_div)}</td> 
              <td className="py-2">{fmt(i.mult.p_col)}</td> 
              <td className="py-2">{fmt(i.mult.p_qual)}</td> 
              <td className="py-2">{fmt(i.mult.p_id)}</td> 
              <td className="py-2">{fmt(i.mult.decay)}</td> 
              <td className="py-2">{new 
Date(i.ts*1000).toISOString().slice(0,10)}</td> 
            </tr> 
          ))} 
        </tbody> 
      </table> 
      <p className="text-xs text-gray-500 mt-3"> 
        * Los multiplicadores están acotados para evitar gaming. 
Consulta la{" "} 
        <a className="underline" 
href="/docs/reputation">metodología</a>. 
      </p> 
    </div> 
  ); 
} 
 
function fmt(x?:number){ return typeof x==="number" ? x.toFixed(2) : 
"—"; } 
function label(k:string){ 
  const map:Record<string,string>={ 
    vote:"Voto de gobernanza", proposal_accepted:"Propuesta aceptada", 
reward_claim:"Recompensa", 
    sbt_badge:"Badge SBT", pr_merged:"PR mergeado", code_review:"Code 
review", forum_answer:"Respuesta aceptada", 
    stake_time_gnew0:"Stake productivo" 
  }; 
  return map[k] || k; 
} 
 
 
