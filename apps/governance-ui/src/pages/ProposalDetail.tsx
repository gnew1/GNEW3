import React, { useEffect, useState } from "react"; 
import { useParams } from "react-router-dom"; 
import { Contract, JsonRpcProvider } from "ethers"; 
import { ABIS } from "../abi"; 
import VotePanel from "../components/VotePanel"; 
import QueueExecutePanel from "../components/QueueExecutePanel"; 
 
export default function ProposalDetail() { 
  const { id } = useParams<{ id: string }>(); 
  const [desc, setDesc] = useState<string>(""); 
 
  useEffect(() => { 
    (async () => { 
      const rpc = new JsonRpcProvider(import.meta.env.VITE_RPC_URL as 
string); 
      const gov = new Contract(import.meta.env.VITE_GOVERNOR_ADDRESS 
as string, ABIS.Governor, rpc); 
      const ev = await 
gov.queryFilter(gov.filters.ProposalCreated(BigInt(id!))); 
      setDesc(ev[0]?.args?.description ?? ""); 
    })().catch(console.error); 
  }, [id]); 
 
  if (!id) return null; 
  return ( 
    <div className="grid gap-4"> 
      <div className="rounded-2xl border p-4"> 
        <div className="text-sm opacity-70">Propuesta #{id}</div> 
        <h1 className="text-xl font-semibold">{desc}</h1> 
      </div> 
      <VotePanel proposalId={id} /> 
      <QueueExecutePanel proposalId={id} description={desc} /> 
    </div> 
  ); 
} 
 
