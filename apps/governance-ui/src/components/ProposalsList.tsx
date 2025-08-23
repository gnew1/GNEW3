import React, { useEffect, useState } from "react"; 
import { Contract, JsonRpcProvider, ethers } from "ethers"; 
import { ABIS } from "../abi"; 
import { Link } from "react-router-dom"; 
 
type Item = { id: bigint; proposer: string; description: string }; 
 
export default function ProposalsList() { 
  const [items, setItems] = useState<Item[]>([]); 
 
  useEffect(() => { 
    (async () => { 
      const rpc = new JsonRpcProvider(import.meta.env.VITE_RPC_URL as 
string); 
      const govAddr = import.meta.env.VITE_GOVERNOR_ADDRESS as string; 
      const gov = new Contract(govAddr, ABIS.Governor, rpc); 
      const ev = await gov.queryFilter(gov.filters.ProposalCreated()); 
      const out = ev.map((e) => { 
        const id = e.args?.proposalId as bigint; 
        const proposer = e.args?.proposer as string; 
        const description = e.args?.description as string; 
        return { id, proposer, description }; 
      }).reverse(); 
      setItems(out); 
    })().catch(console.error); 
  }, []); 
 
  return ( 
    <div className="rounded-2xl border p-4"> 
      <h2 className="text-lg font-semibold mb-2">Propuestas</h2> 
      <div className="grid gap-2"> 
        {items.map((p) => ( 
          <Link key={p.id.toString()} 
to={`/proposal/${p.id.toString()}`} className="border rounded p-3 
hover:bg-gray-50"> 
            <div className="text-sm">#{p.id.toString()}</div> 
            <div className="font-medium">{p.description}</div> 
            <div className="text-xs opacity-70">by {p.proposer}</div> 
          </Link> 
        ))} 
        {items.length === 0 && <div className="text-sm opacity-70">No 
hay propuestas aún.</div>} 
      </div> 
    </div> 
  ); 
} 
 
