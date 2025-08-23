import React, { useState } from "react"; 
import { Contract, ethers } from "ethers"; 
import { getSigner } from "../eth"; 
import { ABIS } from "../abi"; 
 
export default function QueueExecutePanel({ proposalId, description }: 
{ proposalId: string; description: string }) { 
  const [tx1, setTx1] = useState(""); const [tx2, setTx2] = 
useState(""); 
 
  async function queue() { 
    const govAddr = import.meta.env.VITE_GOVERNOR_ADDRESS as string; 
    const signer = await getSigner(); 
    const s = signer.type === "browser" ? await 
signer.provider.getSigner() : signer.wallet; 
    const gov = new Contract(govAddr, ABIS.Governor, s); 
 
    // Reconstituye los datos de la propuesta (en este ejemplo, 1 
target: governor.setQuorumBps) 
    // En producción, deberías persistir `targets,values,calldatas` al 
crearla. 
    const descHash = ethers.id(description); 
    const evs = await 
gov.queryFilter(gov.filters.ProposalCreated(proposalId)); 
    const e = evs[0]; 
    const targets = e.args?.targets as string[]; 
    const values  = e.args?.values as bigint[]; 
    const datas   = e.args?.calldatas as string[]; 
 
    const tx = await gov.queue(targets, values, datas, descHash); 
    setTx1((await tx.wait())?.hash || ""); 
  } 
 
  async function execute() { 
    const govAddr = import.meta.env.VITE_GOVERNOR_ADDRESS as string; 
    const signer = await getSigner(); 
    const s = signer.type === "browser" ? await 
signer.provider.getSigner() : signer.wallet; 
    const gov = new Contract(govAddr, ABIS.Governor, s); 
 
    const descHash = ethers.id(description); 
    const evs = await 
gov.queryFilter(gov.filters.ProposalCreated(proposalId)); 
    const e = evs[0]; 
    const targets = e.args?.targets as string[]; 
    const values  = e.args?.values as bigint[]; 
    const datas   = e.args?.calldatas as string[]; 
 
    const tx = await gov.execute(targets, values, datas, descHash); 
    setTx2((await tx.wait())?.hash || ""); 
  } 
 
  return ( 
    <div className="rounded-2xl border p-4"> 
      <div className="font-semibold mb-2">Timelock</div> 
      <div className="grid gap-2"> 
        <button className="px-3 py-2 rounded border" 
onClick={queue}>Queue</button> 
        {tx1 && <div className="text-xs">queue tx: {tx1}</div>} 
        <button className="px-3 py-2 rounded border" 
onClick={execute}>Execute</button> 
        {tx2 && <div className="text-xs">exec tx: {tx2}</div>} 
      </div> 
    </div> 
  ); 
} 
 
