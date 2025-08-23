import { ethers } from "ethers"; 
import fs from "fs"; 
async function main() { 
const rpc = process.env.GNEW_RPC_URL!; 
const registry = process.env.REPUTATION_REGISTRY!; 
const pk = process.env.REP_UPDATER_KEY!; 
const provider = new ethers.JsonRpcProvider(rpc); 
const wallet = new ethers.Wallet(pk, provider); 
const abi = [ 
"function anchorRoot(uint64 epoch, bytes32 merkleRoot, uint32 
version, bytes32 formulaHash, bytes32 codeHash, string ipfsURI) 
external", 
"function getRoot(uint64 epoch) view returns (tuple(bytes32 
merkleRoot, bytes32 formulaHash, bytes32 codeHash, string ipfsURI, 
uint64 updatedAt, uint32 version))" 
]; 
const reg = new ethers.Contract(registry, abi, wallet); 
const meta = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); 
// out/meta.json 
const { epoch, merkleRoot, scoresHash, configHash, codeHash } = 
meta; 
const ipfsURI = process.argv[3]; // ipfs://CID de paquete audit 
// convertir merkleRoot hex a bytes32 
const rootBytes32 = ethers.hexlify(ethers.getBytes(merkleRoot)); 
const tx = await reg.anchorRoot(epoch, rootBytes32, meta.version, 
configHash, codeHash, ipfsURI); 
console.log("anchored:", tx.hash); 
} 
main().catch(e=>{ console.error(e); process.exit(1); }); 
 
 
