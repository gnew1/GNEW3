"use client"; 
import React, { useState } from "react"; 
 
export default function TaxCompliancePanel({ apiBase = "/api/tax" }: { 
apiBase?: string }) { 
  const [ivaPath, setIvaPath] = useState<string>(""); 
  const [status, setStatus] = useState<string>(""); 
 
  const computeIVA = async () => { 
    setStatus("Procesando IVA…"); 
    const payload = { 
      period: "2025Q1", 
      taxpayer_vat: "ESB12345678", 
      items: [{ 
        txid:"tx-1", date:"2025-01-10", country_code:"ES", 
type:"service", customer_tax_id:"", customer_is_business:false, 
        category:"hosteleria", currency:"EUR", amount_net:1000.00, 
vat_rate:null, account:"700.1" 
      }] 
    }; 
    const r = await 
fetch(`${apiBase}/vat/es/compute?period=${payload.period}&taxpayer_vat
 =${payload.taxpayer_vat}`, { 
      method: "POST", headers: { "Content-Type": "application/json" }, 
body: JSON.stringify(payload.items) 
    }); 
    const d = await r.json(); 
    if (d.ok) { setIvaPath(d.iva_303_path); setStatus("IVA 303 
generado."); } else { setStatus("Error: " + JSON.stringify(d)); } 
  }; 
 
  return ( 
    <div className="rounded-2xl shadow p-4 space-y-3"> 
      <h2 className="text-xl font-semibold">Cumplimiento fiscal</h2> 
      <p className="text-sm text-gray-600">Declaraciones, anexos y 
retenciones automáticas.</p> 
      <div className="flex gap-2"> 
        <button className="px-3 py-2 rounded bg-blue-600 text-white" 
onClick={computeIVA}>Generar IVA (ES 303)</button> 
        {ivaPath && <a className="underline" 
href={`${apiBase}/download?path=${encodeURIComponent(ivaPath)}`} 
target="_blank">Descargar 303</a>} 
      </div> 
      <div className="text-sm text-gray-500">{status}</div> 
      <hr /> 
      <p className="text-xs text-gray-500">DoD: validación sintáctica 
y de reglas activas; retenciones y consentimientos gestionados.</p> 
    </div> 
  ); 
} 
 
 
Ruta completa: ./apps/web/src/pages/api/tax/[...path].ts 
import type { NextApiRequest, NextApiResponse } from "next"; 
 
export default async function handler(req: NextApiRequest, res: 
NextApiResponse) { 
const BASE = process.env.TAX_ENGINE_URL || "http://localhost:8041"; 
const path = (req.query.path as string[]).join("/"); 
const url = `${BASE}/${path}${req.url?.split("...path")[1] || ""}`; 
const r = await fetch(url, { method: req.method, headers: { 
"Content-Type":"application/json" }, body: req.method !== "GET" ? 
JSON.stringify(req.body) : undefined }); 
const buf = await r.arrayBuffer(); 
res.status(r.status); 
const ct = r.headers.get("content-type") || "application/json"; 
res.setHeader("content-type", ct); 
res.send(Buffer.from(buf)); 
} 
