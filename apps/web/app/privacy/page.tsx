// Página de configuración avanzada (incluye ChannelFlowModal) 
"use client"; 
import React, { useState } from "react"; 
import ChannelFlowModal from "@/components/consent/ChannelFlowModal"; 
import ConsentCenter from "@/components/consent/ConsentCenter"; 
export default function PrivacyPage() { 
const [open, setOpen] = useState(false); 
  const subjectId = "demo_subject"; // inyectar desde sesión 
  return ( 
    <div className="p-6 space-y-6"> 
      <h1 className="text-2xl font-semibold">Privacidad y 
Consentimiento</h1> 
      <p className="text-sm text-gray-600">Gestiona por finalidad y 
canal. Descarga un recibo o revoca.</p> 
      <button className="px-4 py-2 border rounded" 
onClick={()=>setOpen(true)}>Gestionar por canal</button> 
      <ConsentCenter subjectId={subjectId}/> 
      <ChannelFlowModal subjectId={subjectId} open={open} 
onClose={()=>setOpen(false)}/> 
    </div> 
  ); 
} 
 
