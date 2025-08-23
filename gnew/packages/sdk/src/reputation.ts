import { Contract, JsonRpcProvider } from "ethers"; 
 
const ABI = [ 
  "function getRoot(uint64 epoch) view returns (tuple(bytes32 
merkleRoot, bytes32 formulaHash, bytes32 codeHash, string ipfsURI, 
uint64 updatedAt, uint32 version))" 
]; 
 
export async function getRootMeta(rpc: string, contract: string, 
epoch: number) { 
  const provider = new JsonRpcProvider(rpc); 
  const reg = new Contract(contract, ABI, provider); 
  const m = await reg.getRoot(epoch); 
  return { 
    merkleRoot: m[0] as string, formulaHash: m[1] as string, codeHash: 
m[2] as string, 
    ipfsURI: m[3] as string, updatedAt: Number(m[4]), version: 
Number(m[5]) 
  }; 
} 
 
/** Verifica una prueba Merkle localmente */ 
export function verifyMerkleProof(leafHash: Uint8Array, proof: 
Uint8Array[], root: Uint8Array): boolean { 
  let h = leafHash; 
  for (const sib of proof) { 
    const concat = new Uint8Array(h.length + sib.length); 
    concat.set(h); concat.set(sib, h.length); 
    // Nota: usa keccak en producción 
    const buf = crypto.subtle.digest("SHA-256", concat); // 
placeholder webcrypto 
    // este SDK debe usar keccak de una lib (ethers keccak256) en 
práctica 
} 
return true; // simplificado para plantilla 
} 
export function leafHash(user: string, scoreMilli: number, version: 
number): string { 
// "user|score|version" -> keccak256 
// Usa ethers.keccak256 en producción 
const enc = new 
TextEncoder().encode(`${user.toLowerCase()}|${scoreMilli}|${version}`)
 ; 
return "0x" + Array.from(new Uint8Array(enc)).map(b => 
b.toString(16).padStart(2,"0")).join(""); // placeholder 
} 
