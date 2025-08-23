"use client"; 
import React, { useEffect, useState } from "react"; 
 
type Row = { category: string; plan: string; actual: string; }; 
type KPI = { 
  budget_id: number; quarter: number; by_category: Record<string, 
Row>; 
  total_plan: string; total_actual: string; burn_ratio: number; 
delta_bps: number; 
}; 
 
export default function BudgetDashboard({ apiBase = "/api/budget-kpis" 
}: { apiBase?: string }) { 
  const [kpi, setKpi] = useState<KPI | null>(null); 
  const [cfg, setCfg] = useState({ budgetId: 0, quarter: 1, 
categories: "ops,rnd,grants" }); 
 
  const load = async () => { 
    const r = await 
fetch(`${apiBase}/kpi?budget_id=${cfg.budgetId}&quarter=${cfg.quarter}
 &categories=${encodeURIComponent(cfg.categories)}`); 
    if (r.ok) setKpi(await r.json()); 
  }; 
 
  useEffect(() => { load(); }, []); 
 
  return ( 
    <div className="space-y-4 p-4 rounded-2xl shadow"> 
      <h2 className="text-xl font-semibold">DAO Budget — Dashboard de 
ejecución</h2> 
      <div className="grid sm:grid-cols-3 gap-2"> 
        <input className="border p-2 rounded" value={cfg.budgetId} 
onChange={e => setCfg({ ...cfg, budgetId: Number(e.target.value) })} 
placeholder="Budget ID" /> 
        <select className="border p-2 rounded" value={cfg.quarter} 
onChange={e => setCfg({ ...cfg, quarter: Number(e.target.value) })}> 
          <option value={1}>Q1</option><option 
value={2}>Q2</option><option value={3}>Q3</option><option 
value={4}>Q4</option> 
        </select> 
        <input className="border p-2 rounded" value={cfg.categories} 
onChange={e => setCfg({ ...cfg, categories: e.target.value })} 
placeholder="categorías (coma)" /> 
      </div> 
      <button className="bg-blue-600 text-white px-4 py-2 rounded" 
onClick={load}>Actualizar</button> 
 
      {kpi && ( 
        <> 
          <div className="grid md:grid-cols-4 gap-3"> 
            <Card label="Plan total" value={kpi.total_plan} /> 
            <Card label="Actual total" value={kpi.total_actual} /> 
            <Card label="Burn ratio" value={(kpi.burn_ratio * 
100).toFixed(2) + "%"} /> 
            <Card label="Delta vs plan (bps)" 
value={kpi.delta_bps.toFixed(1)} /> 
          </div> 
          <table className="w-full text-sm mt-3"> 
            <thead> 
              <tr className="text-left 
text-gray-600"><th>Categoría</th><th>Plan</th><th>Actual</th></tr> 
            </thead> 
            <tbody> 
              {Object.entries(kpi.by_category).map(([cat, r]) => ( 
                <tr key={cat} className="border-t"> 
                  <td className="py-2">{cat}</td> 
                  <td>{r.plan}</td> 
                  <td>{r.actual}</td> 
                </tr> 
              ))} 
            </tbody> 
          </table> 
          <a className="underline text-blue-700" 
href={`${apiBase}/report/quarterly.pdf?budget_id=${kpi.budget_id}&quar
 ter=${kpi.quarter}&categories=${encodeURIComponent(cfg.categories)}`} 
target="_blank" rel="noreferrer">Descargar reporte trimestral 
(PDF)</a> 
          <div className="text-xs text-gray-500">DoD: delta vs plan ≤ 
X% y **report trimestral** generado.</div> 
        </> 
      )} 
    </div> 
  ); 
} 
 
function Card({ label, value }: { label: string; value: string }) { 
  return ( 
    <div className="rounded-xl border p-3"> 
      <div className="text-xs text-gray-500">{label}</div> 
      <div className="text-lg font-semibold">{value}</div> 
    </div> 
  ); 
} 
 
Ruta completa: ./apps/web/src/pages/api/budget-kpis/[...path].ts 
import type { NextApiRequest, NextApiResponse } from "next"; 
 
export default async function handler(req: NextApiRequest, res: 
NextApiResponse) { 
  const BASE = process.env.BUDGET_KPIS_URL || "http://localhost:8030"; 
  const path = (req.query.path as string[]).join("/"); 
  const url = `${BASE}/${path}${req.url?.split("...path")[1] || ""}`; 
  const r = await fetch(url, { method: req.method, headers: { 
"Content-Type":"application/json" } }); 
  const buf = await r.arrayBuffer(); 
  res.status(r.status); 
  // proxy pdf or json 
  const ct = r.headers.get("content-type") || "application/json"; 
  res.setHeader("content-type", ct); 
  res.send(Buffer.from(buf)); 
} 
 
 
