import React, { useEffect, useState } from "react"; 
 
type Proposal = { 
  id: string; 
  title: string; 
  description: string; 
  status: "Pending" | "Active" | "Succeeded" | "Queued" | "Executed" | 
"Canceled" | "Defeated"; 
  forVotes: string; 
  againstVotes: string; 
  abstainVotes: string; 
  eta?: number; 
}; 
 
export const GovernancePortal: React.FC<{ 
  apiBase?: string; 
}> = ({ apiBase = "/governance" }) => { 
  const [proposals, setProposals] = useState<Proposal[]>([]); 
  const [selected, setSelected] = useState<Proposal | null>(null); 
  const [participation, setParticipation] = useState<string>("—"); 
 
  useEffect(() => { 
    // En un entorno real, obtener desde subgraph/Tally. Aquí 
mock/fetch. 
    (async () => { 
      const resp = await fetch(`${apiBase}/proposals`).catch(() => 
null); 
      if (resp?.ok) { 
        setProposals(await resp.json()); 
      } else { 
        setProposals([]); 
      } 
    })(); 
  }, [apiBase]); 
 
  const loadParticipation = async (p: Proposal) => { 
    const r = await fetch(`${apiBase}/participation/${p.id}`).then(r 
=> r.json()); 
    setParticipation((r.participation * 100).toFixed(2) + "%"); 
  }; 
 
  return ( 
    <div className="grid gap-4 p-4"> 
      <header className="flex items-center justify-between"> 
        <h1 className="text-2xl font-semibold">Gobernanza GNEW</h1> 
        <div className="text-sm text-gray-500">Snapshot + Governor + 
Timelock</div> 
      </header> 
 
      <section className="grid md:grid-cols-3 gap-3"> 
        {proposals.map(p => ( 
          <button 
            key={p.id} 
            onClick={() => { setSelected(p); loadParticipation(p); }} 
            className="text-left rounded-2xl shadow p-4 
hover:shadow-md" 
          > 
            <div className="text-xs uppercase tracking-wide 
text-gray-500">{p.status}</div> 
            <div className="text-lg font-medium">{p.title}</div> 
            <div className="text-sm text-gray-600 
line-clamp-3">{p.description}</div> 
            <div className="mt-2 text-xs">For: {p.forVotes} • Against: 
{p.againstVotes} • Abstain: {p.abstainVotes}</div> 
          </button> 
        ))} 
      </section> 
 
      {selected && ( 
        <aside className="rounded-2xl shadow p-4"> 
          <h2 className="text-xl font-semibold">{selected.title}</h2> 
          <p className="text-sm text-gray-600 
mt-1">{selected.description}</p> 
          <div className="mt-3 text-sm"> 
            Participación (for+abstain/totalSupply): 
<b>{participation}</b> 
          </div> 
          <div className="mt-4 flex gap-2"> 
            <button className="rounded-xl px-4 py-2 shadow" 
onClick={() => window.alert("Cast vote FOR (wire to wallet)")}>Votar 
FOR</button> 
            <button className="rounded-xl px-4 py-2 shadow" 
onClick={() => window.alert("Cast vote AGAINST")}>Votar 
AGAINST</button> 
            <button className="rounded-xl px-4 py-2 shadow" 
onClick={() => window.alert("Cast vote ABSTAIN")}>Abstenerse</button> 
          </div> 
        </aside> 
      )} 
    </div> 
  ); 
}; 
 
Puedes exponer el API de governance bajo /governance desde el gateway o vía 
nginx para que el portal funcione out-of-the-box. 
 
Plantillas de propuestas (on-chain/off-chain) 
