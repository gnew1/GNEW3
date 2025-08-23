import React, { useState } from "react"; 
import { Contract, ethers } from "ethers"; 
import { getSigner } from "../eth"; 
import { ABIS } from "../abi"; 
 
export default function ProposalForm() { 
  const [desc, setDesc] = useState(""); 
  const [newQuorum, setNewQuorum] = useState("300"); // ejemplo: 
setQuorumBps(3%) 
  const [txHash, setTxHash] = useState<string>(""); 
 
  async function onSubmit(e: React.FormEvent) { 
    e.preventDefault(); 
    const govAddr = import.meta.env.VITE_GOVERNOR_ADDRESS as string; 
    const signer = await getSigner(); 
    const signerOrProv = signer.type === "browser" ? await 
signer.provider.getSigner() : signer.wallet; 
 
    const gov = new Contract(govAddr, ABIS.Governor, signerOrProv); 
 
    // Propuesta simple que apunta al propio governor: 
setQuorumBps(uint16) 
    const targets = [govAddr]; 
    const values = [0]; 
    const calldatas = 
[gov.interface.encodeFunctionData("setQuorumBps", 
[Number(newQuorum)])]; 
    const description = desc || `set quorum to ${newQuorum} bps`; 
 
    const tx = await gov.propose(targets, values, calldatas, 
description); 
    const rc = await tx.wait(); 
    setTxHash(rc?.hash as string); 
  } 
 
  return ( 
    <form className="rounded-2xl border p-4 grid gap-3" 
onSubmit={onSubmit}> 
      <h2 className="text-lg font-semibold">Crear propuesta</h2> 
      <label className="text-sm">Descripción</label> 
      <input className="border rounded p-2" value={desc} 
onChange={(e)=>setDesc(e.target.value)} placeholder="Descripción de la 
propuesta" /> 
      <label className="text-sm">Nuevo quorum (bps)</label> 
      <input className="border rounded p-2" value={newQuorum} 
onChange={(e)=>setNewQuorum(e.target.value)} /> 
      <button className="px-3 py-2 rounded bg-black text-white 
mt-2">Proponer</button> 
      {txHash && <div className="text-xs opacity-70">tx: 
{txHash}</div>} 
    </form> 
  ); 
} 
 
