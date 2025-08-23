import React, { useEffect, useState } from "react"; 
type Guardian = { address: string; did?: string }; 
type Props = { 
guardians: Guardian[]; threshold: number; contract: string; chainId: 
number; 
timelockSec: number; expirySec: number; 
}; 
export default function RecoveryFlow({ guardians, threshold, contract, 
chainId, timelockSec, expirySec }: Props) { 
  const [proposed, setProposed] = useState(""); 
  const [sigs, setSigs] = useState<{signer:string; sig:string}[]>([]); 
  const [nonce, setNonce] = useState<number>(0); 
  const [eta, setEta] = useState<number|null>(null); 
 
  async function onCollectSig(g: Guardian) { 
    // aquí llamarías a wallet.request({method:"eth_signTypedData_v4", 
params:[...]}) 
    // demo: push firma mock 
    setSigs(prev => [...prev, { signer: g.address, sig: "0xsig" }]); 
  } 
 
  async function onProposeBatch() { 
    if (sigs.length < threshold) return alert("Faltan firmas"); 
    // POST /v1/recovery/proposeBatch ... 
    setEta(Date.now()/1000 + timelockSec); 
  } 
 
  async function onFinalize() { 
    // POST /v1/recovery/finalize ... 
  } 
 
  const rem = eta ? Math.max(0, Math.floor(eta - Date.now()/1000)) : 
0; 
 
  return ( 
    <div className="rounded-2xl border p-5 shadow-sm"> 
      <h3 className="text-lg font-semibold mb-2">Recuperación 
social</h3> 
      <div className="space-y-2"> 
        <input className="border rounded-xl px-3 py-2 w-full" 
placeholder="Nuevo owner (0x...)" value={proposed} 
onChange={e=>setProposed(e.target.value)} /> 
        <div className="text-sm text-gray-600">Guardians 
({guardians.length}) • Umbral N={threshold}</div> 
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2"> 
          {guardians.map(g=>( 
            <button key={g.address} onClick={()=>onCollectSig(g)} 
className="border rounded-xl px-3 py-2 text-left hover:bg-gray-50"> 
              <div className="font-mono 
text-xs">{g.address.slice(0,10)}…</div> 
              <div className="text-xs text-gray-500">{g.did || 
"—"}</div> 
            </button> 
          ))} 
        </div> 
        <div className="text-xs text-gray-500">Firmas recolectadas: 
{sigs.length}/{threshold}</div> 
        <div className="flex gap-2"> 
          <button className="px-4 py-2 rounded-xl bg-black text-white" 
onClick={onProposeBatch}>Proponer (batch)</button> 
          <button className="px-4 py-2 rounded-xl bg-emerald-600 
text-white" onClick={onFinalize} disabled={!eta || rem>0}> 
            {eta && rem>0 ? `Finalizar en ${rem}s` : "Finalizar"} 
          </button> 
        </div> 
      </div> 
    </div> 
  ); 
} 
 
 
