import React from "react"; 
import { improvementTips } from "@gnew/sdk/reputation_panel"; 
 
export default function TipsBox({ items }:{ items:any[] }) { 
  const tips = improvementTips(items); 
  if (!tips.length) return null; 
  return ( 
    <div className="rounded-2xl border p-4"> 
      <div className="font-semibold mb-2">Sugerencias 
personalizadas</div> 
      <ul className="list-disc ml-5 text-sm">{tips.map((t)=><li key={t}>{t}</li>)}</ul>
    </div>
  );
}
 
 
