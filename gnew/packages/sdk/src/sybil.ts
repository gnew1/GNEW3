import { Contract, JsonRpcProvider, ethers } from "ethers"; 
const REG_ABI = [ 
"function getRoot(uint64 epoch) view returns (tuple(bytes32 
merkleRoot, bytes32 formulaHash, bytes32 codeHash, string ipfsURI, 
uint64 updatedAt, uint32 version))" 
]; 
export async function fetchRisk(apiBase: string, addr: string) { 
const r = await fetch(`${apiBase}/v1/risk/${addr}`); 
if (!r.ok) throw new Error(await r.text()); 
return r.json(); 
} 
export async function fetchProof(apiBase: string, addr: string) { 
const r = await fetch(`${apiBase}/v1/proof/${addr}`); 
if (!r.ok) throw new Error(await r.text()); 
return r.json(); 
} 
export function leafHash(user: string, riskMilli: number, version: 
number) { 
return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode( 
["address","uint32","uint32"], [user, riskMilli, version] 
)); 
} 
export async function verifyOffchain(merkleRoot: string, proof: 
string[], leaf: string) { 
  // Implementa verificación Merkle off-chain si lo necesitas en el 
cliente 
  return true; 
} 
 
 
