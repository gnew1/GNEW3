import React, { useEffect, useState } from "react"; 
import { Contract } from "ethers"; 
import { getSigner } from "../eth"; 
import { ABIS } from "../abi"; 
 
export default function VotePanel({ proposalId }: { proposalId: string 
}) { 
  const [state, setState] = useState<number>(0); 
  const [reason, setReason] = useState(""); 
  const [q, setQ] = useState<{ for: bigint; against: bigint; abstain: 
bigint } | null>(null); 
 
  async function refresh() { 
    const govAddr = import.meta.env.VITE_GOVERNOR_ADDRESS as string; 
    const signer = await getSigner(); 
    const prov = (signer.type === "browser" ? signer.provider : 
signer.provider) as any; 
    const gov = new Contract(govAddr, ABIS.Governor, prov); 
    const st: number = await gov.state(proposalId); 
    setState(Number(st)); 
    const votes = await gov.proposalVotes(proposalId).catch(() => 
null); 
    if (votes) setQ({ against: votes[0], for: votes[1], abstain: 
votes[2] }); 
  } 
 
  useEffect(() => { refresh().catch(console.error); }, [proposalId]); 
 
  async function cast(support: 0|1|2) { 
    const govAddr = import.meta.env.VITE_GOVERNOR_ADDRESS as string; 
    const signer = await getSigner(); 
    const signerOrProv = signer.type === "browser" ? await 
signer.provider.getSigner() : signer.wallet; 
    const gov = new Contract(govAddr, ABIS.Governor, signerOrProv); 
    const tx = await gov.castVoteWithReason(proposalId, support, 
reason || ""); 
    await tx.wait(); 
    await refresh(); 
  } 
 
  return ( 
    <div className="rounded-2xl border p-4"> 
      <div className="font-semibold mb-2">Votación</div> 
      <div className="text-sm mb-2">Estado: {state} 
(0=Pending,1=Active,3=Defeated,4=Succeeded,5=Queued,7=Executed)</div> 
      {q && ( 
        <div className="text-xs mb-2">For: {q.for.toString()} | 
Against: {q.against.toString()} | Abstain: 
{q.abstain.toString()}</div> 
      )} 
      <input className="border rounded p-2 w-full mb-2" 
placeholder="Razón (opcional)" value={reason} 
onChange={(e)=>setReason(e.target.value)} /> 
      <div className="flex gap-2"> 
        <button className="px-3 py-2 rounded border" 
onClick={()=>cast(1)}>For</button> 
        <button className="px-3 py-2 rounded border" 
onClick={()=>cast(0)}>Against</button> 
        <button className="px-3 py-2 rounded border" 
onClick={()=>cast(2)}>Abstain</button> 
      </div> 
    </div> 
  ); 
} 
 
