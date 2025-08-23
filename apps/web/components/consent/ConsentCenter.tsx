import React, { useEffect } from "react"; 
import { useConsentStore } from "./store"; 
 
export default function ConsentCenter({ subjectId }: { subjectId: 
string }) { 
  const { loadCatalog, loadState, catalog, state, toggle, save } = 
useConsentStore(); 
 
  useEffect(() => { loadCatalog(); loadState(subjectId); }, 
[subjectId, loadCatalog, loadState]); 
 
  if (!catalog || !state) return <div role="status" 
aria-busy="true">Loading…</div>; 
 
  return ( 
    <div className="space-y-6"> 
      <header> 
        <h1 className="text-2xl font-semibold">Privacy & Consent</h1> 
        <p className="text-sm text-gray-500">Control granular por 
dato/uso. Cambios quedan auditados.</p> 
      </header> 
 
      <table className="w-full border-separate border-spacing-0"> 
        <thead> 
          <tr> 
            <th className="text-left p-2 sticky top-0 bg-white">Dato \ 
Uso</th> 
            {catalog.uses.map((u:any) => ( 
              <th key={u.key} className="p-2 text-left">{u.title}</th> 
            ))} 
          </tr> 
        </thead> 
        <tbody> 
          {catalog.dataCategories.map((dc:any) => ( 
            <tr key={dc.key} className="border-t"> 
              <td className="p-2 font-medium">{dc.title}</td> 
              {catalog.uses.map((u:any) => { 
                const rec = state.records.find((r:any) => 
r.dataCategoryKey===dc.key && r.processingUseKey===u.key); 
                const checked = rec?.state === "granted"; 
                const disabled = u.key === "strictly_necessary"; 
                return ( 
                  <td key={u.key} className="p-2"> 
                    <label className="inline-flex items-center gap-2"> 
                      <input 
                        aria-label={`${dc.title} → ${u.title}`} 
                        type="checkbox" 
                        checked={checked} 
                        disabled={disabled} 
                        onChange={() => toggle(dc.key, u.key)} 
                      /> 
                      <span className="text-sm">{checked ? "On" : 
"Off"}</span> 
                    </label> 
                  </td> 
                ); 
              })} 
            </tr> 
          ))} 
        </tbody> 
      </table> 
 
      <div className="flex justify-end gap-3"> 
        <button className="px-4 py-2 rounded border" onClick={() => 
save(subjectId)}>Guardar</button> 
        <a className="px-4 py-2 rounded border" 
href={`/api/consent/${subjectId}/export?fmt=csv`}>Descargar CSV</a> 
      </div> 
    </div> 
  ); 
} 
 
