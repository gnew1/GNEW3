 x 
import React, { useMemo } from "react"; 
import { AreaChart, XAxis, YAxis, Tooltip, Area, ResponsiveContainer } 
from "recharts"; 
 
type Item = { ts:number; contrib:number; kind:string }; 
export default function DecayTimeline({ items }:{ items: Item[] }) { 
  // Construir serie diaria últimos 180 días 
  const now = Math.floor(Date.now()/1000); 
  const start = now - 180*86400; 
  const buckets: Record<string, number> = {}; 
  for (let t=start; t<=now; t+=86400) buckets[new 
Date(t*1000).toISOString().slice(0,10)] = 0; 
  items.forEach(it=>{ 
    const d = new Date(it.ts*1000).toISOString().slice(0,10); 
    if (buckets[d]!==undefined) buckets[d] += it.contrib; 
  }); 
  const data = useMemo(()=> Object.entries(buckets).map(([d,v])=>({ 
date:d, contrib:+v.toFixed(3) })), [items]); 
 
  return ( 
    <div className="rounded-2xl border p-4"> 
      <div className="font-semibold mb-2">Línea temporal 
(decaimiento)</div> 
      <div className="h-64"> 
        <ResponsiveContainer> 
          <AreaChart data={data}> 
            <XAxis dataKey="date" hide /> 
            <YAxis /> 
            <Tooltip /> 
            <Area dataKey="contrib" type="monotone" fillOpacity={0.2} 
/> 
          </AreaChart> 
        </ResponsiveContainer> 
      </div> 
      <p className="text-xs text-gray-500 mt-2">Visualiza cómo tus 
aportaciones van decayendo con el tiempo.</p> 
    </div> 
  ); 
} 
 
 
/gnew/apps/web/components/reputation/WhatIfSimulator.
 tsx 
import React, { useMemo, useState } from "react"; 
 
type Item = { kind:string; contrib:number }; 
const KINDS = [ 
  { key:"pr_merged", label:"PRs mergeados"}, { key:"code_review", 
label:"Reviews útiles"}, 
  { key:"vote", label:"Votos"}, { key:"sbt_badge", label:"Badges SBT 
relevantes"} 
]; 
 
export default function WhatIfSimulator({ baseScore, items }:{ 
baseScore:number; items: Item[] }) { 
  const [mods, setMods] = useState<Record<string,number>>({ 
pr_merged:0, code_review:0, vote:0, sbt_badge:0 }); 
  const current = useMemo(()=> baseScore + 
Object.entries(mods).reduce((acc,[k,v])=>{ 
    const avg = avgContrib(items, k); 
    return acc + v*avg; 
  },0), [mods, baseScore, items]); 
 
  return ( 
    <div className="rounded-2xl border p-4"> 
      <div className="font-semibold mb-2">¿Y si…? (simulador 
simple)</div> 
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> 
        {KINDS.map(k=>( 
          <div key={k.key} className="flex items-center 
justify-between"> 
            <label className="text-sm">{k.label} (próx. 30 
días)</label> 
            <input type="number" className="border rounded-xl px-2 
py-1 w-24 text-right" 
              value={mods[k.key]||0} 
              onChange={e=>setMods({...mods, [k.key]: 
Number(e.target.value||0)})}/> 
          </div> 
        ))} 
      </div> 
      <div className="mt-3 text-sm">Score estimado: <span 
className="font-semibold">{Math.round(current)}</span></div> 
      <p className="text-xs text-gray-500">Estimación lineal basada en 
tu contribución media por factor (no contractual).</p> 
    </div> 
  ); 
} 
 
function avgContrib(items: Item[], kind:string){ 
  const arr = items.filter(i=>i.kind===kind).map(i=>i.contrib); 
  if (!arr.length) return 0; 
  return arr.reduce((a,b)=>a+b,0)/arr.length; 
} 
 
 
