"use client"; 
import React, { useEffect, useState } from "react"; 
 
// Flujo granular para “gestión por finalidad y canal” 
(email/sms/push/onchain) 
export default function ChannelFlowModal({ subjectId, open, onClose 
}:{ subjectId:string; open:boolean; onClose:()=>void }) { 
  const [mv, setMv] = useState<string>("v1"); 
  const [state, setState] = useState<any>({ email: { marketing: false 
}, sms: { notifications: false }, push: { notifications: false }, 
onchain: { marketing: false } }); 
 
  useEffect(() => { 
    if (!open) return; 
    
fetch("/api/consent/catalog").then(r=>r.json()).then((c)=>setMv(c.matr
 ixVersion)); 
  }, [open]); 
 
  const save = async () => { 
    const decisions = []; 
    // email marketing 
    decisions.push({ 
      purposeKey: "growth_marketing", dataCategoryKey: "email", 
processingUseKey: "marketing", channelKey: "email", 
      state: state.email.marketing ? "granted" : "denied", 
policyVersion: mv, provenance: "ui_flow" 
    }); 
    // sms/push notificaciones 
    for (const channelKey of ["sms","push"] as const) { 
      decisions.push({ 
        purposeKey: "account_access", dataCategoryKey: "phone", 
processingUseKey: "notifications", channelKey, 
        state: state[channelKey].notifications ? "granted" : "denied", 
policyVersion: mv, provenance: "ui_flow" 
      }); 
    } 
    // onchain marketing (airdrop/POAPs) 
    decisions.push({ 
      purposeKey: "growth_marketing", dataCategoryKey: "wallet_id", 
processingUseKey: "marketing", channelKey: "onchain", 
      state: state.onchain.marketing ? "granted" : "denied", 
policyVersion: mv, provenance: "ui_flow" 
    }); 
 
    await fetch(`/api/consent/${subjectId}/decisions`, { 
method:"POST", headers:{"Content-Type":"application/json"}, body: 
JSON.stringify({ decisions }) }); 
    onClose(); 
  }; 
 
  if (!open) return null; 
 
  return ( 
    <div role="dialog" aria-modal className="fixed inset-0 bg-black/40 
z-50 flex items-center justify-center"> 
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 
space-y-4"> 
        <h2 className="text-xl font-semibold">Preferencias por 
canal</h2> 
        <Section title="Email"> 
          <Toggle label="Marketing (boletines/ofertas)" 
checked={state.email.marketing} onChange={(v)=>setState((s:any)=>({ 
...s, email: { ...s.email, marketing: v } }))}/> 
        </Section> 
        <Section title="SMS / Push"> 
          <Toggle label="Notificaciones de seguridad y cuenta" 
checked={state.sms.notifications} onChange={(v)=>setState((s:any)=>({ 
...s, sms: { notifications: v } }))}/> 
          <Toggle label="Notificaciones push en app" 
checked={state.push.notifications} onChange={(v)=>setState((s:any)=>({ 
...s, push: { notifications: v } }))}/> 
        </Section> 
        <Section title="On‑chain"> 
          <Toggle label="Marketing (airdrops/POAPs)" 
checked={state.onchain.marketing} onChange={(v)=>setState((s:any)=>({ 
...s, onchain: { marketing: v } }))}/> 
        </Section> 
        <div className="flex justify-end gap-2"> 
          <button className="px-4 py-2 border rounded" 
onClick={onClose}>Cancelar</button> 
          <button className="px-4 py-2 bg-black text-white rounded" 
onClick={save}>Guardar</button> 
        </div> 
        <p className="text-xs text-gray-500">Tus cambios quedan 
auditados y puedes revocar en cualquier momento.</p> 
      </div> 
    </div> 
  ); 
} 
 
function Section({ title, children }:{ title:string; 
children:React.ReactNode }) { 
  return <div className="space-y-2"><h3 
className="font-medium">{title}</h3><div 
className="space-y-2">{children}</div></div>; 
} 
function Toggle({ label, checked, onChange }:{ label:string; 
checked:boolean; onChange:(v:boolean)=>void }) { 
  return <label className="flex items-center justify-between p-3 
border rounded-lg"><span className="text-sm">{label}</span><input 
type="checkbox" checked={checked} 
onChange={e=>onChange(e.target.checked)}/></label>; 
} 
 
