import { create } from "zustand"; 
 
type Catalog = { uses:any[]; dataCategories:any[]; purposes:any[]; 
matrixVersion:string }; 
type Record = { dataCategoryKey:string; processingUseKey:string; 
state:"granted"|"denied"|"limited"|"withdrawn"; policyVersion:string 
}; 
type State = { 
  catalog?: Catalog; 
  state?: { records: Record[] }; 
  loadCatalog: () => Promise<void>; 
  loadState: (subjectId:string)=>Promise<void>; 
  toggle: (dcKey:string, useKey:string)=>void; 
  save: (subjectId:string)=>Promise<void>; 
} 
 
export const useConsentStore = create<State>((set, get) => ({ 
  loadCatalog: async () => { 
    const res = await fetch("/api/consent/catalog"); set({ catalog: 
await res.json() }); 
  }, 
  loadState: async (subjectId) => { 
    const res = await fetch(`/api/consent/${subjectId}`); set({ state: 
await res.json() }); 
  }, 
  toggle: (dcKey, useKey) => { 
    const st = get().state!; 
    const rec = st.records.find(r => r.dataCategoryKey===dcKey && 
r.processingUseKey===useKey); 
    if (rec) rec.state = rec.state === "granted" ? "denied" : 
"granted"; 
    else st.records.push({ dataCategoryKey: dcKey, processingUseKey: 
useKey, state: "granted", policyVersion: get().catalog!.matrixVersion 
}); 
    set({ state: { ...st } }); 
  }, 
  save: async (subjectId) => { 
    const st = get().state!; 
    const body = { 
      decisions: st.records.map(r => ({ 
        purposeKey: "user_control", // ejemplo: según matriz activa 
        dataCategoryKey: r.dataCategoryKey, 
        processingUseKey: r.processingUseKey, 
        state: r.state, 
        policyVersion: get().catalog!.matrixVersion, 
        provenance: "ui_center" 
      })) 
    }; 
    await fetch(`/api/consent/${subjectId}/decisions`, { 
method:"POST", headers:{ "Content-Type":"application/json" }, body: 
JSON.stringify(body) }); 
  } 
})); 
 
 
OpenAPI (extracto) 
