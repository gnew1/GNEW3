/** 
* Ejemplo genérico de envío de TX con ethers v6 (útil para tareas 
operativas rápidas). 
*/ 
import "dotenv/config"; 
import { ethers } from "ethers"; 
async function main() { 
const rpc = process.env.AMOY_RPC_URL!; 
const pk = process.env.PRIVATE_KEY!; 
const to = process.argv[2]; 
const data = process.argv[3] || "0x"; 
if (!to) throw new Error("Uso: ts-node scripts/sendTx.ts <to> 
[dataHex]"); 
const wallet = new ethers.Wallet(pk, new ethers.JsonRpcProvider(rpc, 
80002)); 
const tx = await wallet.sendTransaction({ to, data }); 
console.log("tx:", tx.hash); 
await tx.wait(); 
console.log("✓ mined"); 
} 
main().catch((e) => (console.error(e), process.exit(1))); 
