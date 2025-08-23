"use client"; 
import React, { useEffect, useState } from "react"; 
type Catalog = { 
uses: any[]; dataCategories: any[]; channels: any[]; matrixVersion: 
string 
}; 
export default function ConsentBanner({ subjectId }: { subjectId: 
string }) { 
const [visible, setVisible] = useState(false); 
const [catalog, setCatalog] = useState<Catalog | null>(null); 
const [choices, setChoices] = useState<any>({ // defaults: strictly 
necessary on; marketing denied 
analytics: false, personalization: false, marketing: false 
  }); 
 
  useEffect(() => { 
    // mostrar banner si no existe cookie de preferencia o si GPC 
activo 
    const hasCookie = document.cookie.includes("gnew_consent="); 
    const gpc = (navigator as any).globalPrivacyControl === true; 
    if (!hasCookie || gpc) setVisible(true); 
    fetch("/api/consent/catalog").then(r => 
r.json()).then(setCatalog); 
  }, []); 
 
  if (!visible || !catalog) return null; 
 
  const save = async (mode: "accept_all" | "reject_all" | "custom") => 
{ 
    const mv = catalog.matrixVersion; 
    const base = [ 
      // strictly necessary (global; no toggle) 
      { purposeKey: "account_access", dataCategoryKey: "device_id", 
processingUseKey: "strictly_necessary", channelKey: null, state: 
"granted" } 
    ]; 
    const mk = mode === "accept_all" ? true : mode === "reject_all" ? 
false : choices.marketing; 
    const an = mode === "accept_all" ? true : mode === "reject_all" ? 
false : choices.analytics; 
    const pe = mode === "accept_all" ? true : mode === "reject_all" ? 
false : choices.personalization; 
 
    const decisions = [ 
      ...base.map(d => ({ ...d, policyVersion: mv, provenance: 
"ui_banner" as const })), 
      // por canal: web (banner), email/sms quedan para flujo 
posterior 
      { purposeKey: "experience_quality", dataCategoryKey: 
"event_raw", processingUseKey: "analytics", channelKey: "web", state: 
an ? "granted" : "denied", policyVersion: mv, provenance: "ui_banner" 
}, 
      { purposeKey: "growth_marketing", dataCategoryKey: "email", 
processingUseKey: "marketing", channelKey: "email", state: mk ? 
"granted" : "denied", policyVersion: mv, provenance: "ui_banner" }, 
      { purposeKey: "experience_quality", dataCategoryKey: "profile", 
processingUseKey: "personalization", channelKey: "in_app", state: pe ? 
"granted" : "denied", policyVersion: mv, provenance: "ui_banner" } 
    ]; 
 
    await fetch(`/api/consent/${subjectId}/decisions`, { 
      method: "POST", headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ decisions }) 
    }); 
    document.cookie = `gnew_consent=${btoa(JSON.stringify({ mk, an, pe 
}))}; Path=/; Max-Age=${60 * 60 * 24 * 365}`; 
    setVisible(false); 
  }; 
 
  return ( 
    <div role="dialog" aria-label="Consent banner" className="fixed 
bottom-4 inset-x-4 bg-white shadow-xl rounded-2xl p-4 z-50"> 
      <div className="flex flex-col gap-3"> 
        <div> 
          <h2 className="text-lg font-semibold">Tu privacidad</h2> 
          <p className="text-sm text-gray-600">Usamos datos por 
finalidad y canal. Puedes aceptar, rechazar o configurar.</p> 
        </div> 
        <div className="grid grid-cols-3 gap-3"> 
          <Card title="Analítica (web)" checked={choices.analytics} 
onChange={(v)=>setChoices((s:any)=>({...s, analytics:v}))}/> 
          <Card title="Personalización (app)" 
checked={choices.personalization} 
onChange={(v)=>setChoices((s:any)=>({...s, personalization:v}))}/> 
          <Card title="Marketing (email)" checked={choices.marketing} 
onChange={(v)=>setChoices((s:any)=>({...s, marketing:v}))}/> 
        </div> 
        <div className="flex flex-wrap gap-2 justify-end"> 
          <button className="px-4 py-2 border rounded" 
onClick={()=>save("reject_all")}>Rechazar todo</button> 
          <button className="px-4 py-2 border rounded" 
onClick={()=>save("custom")}>Guardar selección</button> 
          <button className="px-4 py-2 bg-black text-white rounded" 
onClick={()=>save("accept_all")}>Aceptar todo</button> 
        </div> 
        <a className="text-xs underline text-gray-500" 
href="/privacy">Política y configuración avanzada</a> 
      </div> 
    </div> 
  ); 
} 
 
function Card({ title, checked, onChange }:{ title:string; 
checked:boolean; onChange:(v:boolean)=>void }) { 
  return ( 
    <label className="p-3 border rounded-xl flex items-center 
justify-between"> 
      <span className="text-sm">{title}</span> 
      <input type="checkbox" checked={checked} 
onChange={e=>onChange(e.target.checked)} aria-label={title}/> 
    </label> 
  ); 
} 
 
