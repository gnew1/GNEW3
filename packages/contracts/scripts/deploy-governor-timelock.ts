import "dotenv/config"; 
import { ethers } from "hardhat"; 
 
async function main() { 
  const tokenVotes = process.env.TOKEN_VOTES_ADDRESS!; 
  const repVotes = process.env.REPUTATION_SCORE_ADDRESS!; 
  const timelockAddr = process.env.TIMELOCK_ADDRESS!; 
  if (!tokenVotes || !repVotes || !timelockAddr) throw new 
Error("Faltan env: 
TOKEN_VOTES_ADDRESS/REPUTATION_SCORE_ADDRESS/TIMELOCK_ADDRESS"); 
 
  const tokenWeightBps = Number(process.env.GOV_TOKEN_WEIGHT_BPS || 
"7000"); 
  const repWeightBps   = Number(process.env.GOV_REP_WEIGHT_BPS   || 
"3000"); 
  const quorumBps      = Number(process.env.GOV_QUORUM_BPS || "400"); 
  const votingDelay    = Number(process.env.GOV_VOTING_DELAY || "1"); 
  const votingPeriod   = Number(process.env.GOV_VOTING_PERIOD || "5"); 
  const threshold      = Number(process.env.GOV_PROPOSAL_THRESHOLD || 
"0"); 
 
  const GF = await 
ethers.getContractFactory("GnewGovernorTimelocked"); 
  const gov = await GF.deploy( 
    tokenVotes, repVotes, tokenWeightBps, repWeightBps, quorumBps, 
votingDelay, votingPeriod, threshold, 
timelockAddr 
); 
await gov.waitForDeployment(); 
console.log("GnewGovernorTimelocked @", await gov.getAddress()); 
} 
main().catch((e)=> (console.error(e), process.exit(1))); 
/packages/contracts/README.md (añade guía rápida despliegue timelock + governor UI) 
### Governor con Timelock (N14) 
Despliega `TimelockController` (N6) y luego: 
```bash 
export TOKEN_VOTES_ADDRESS=0x... 
export REPUTATION_SCORE_ADDRESS=0x... 
export TIMELOCK_ADDRESS=0x... 
pnpm --filter @gnew/contracts hardhat run --network holesky 
scripts/deploy-governor-timelock.ts 
Otorga PROPOSER_ROLE al Governor y EXECUTOR_ROLE a address(0) o DAO según 
política. 
/apps/governance-ui/.env.example 
VITE_RPC_URL=http://127.0.0.1:8545 
VITE_GOVERNOR_ADDRESS=0xYourGovernor 
VITE_TIMELOCK_ADDRESS=0xYourTimelock 
VITE_FORCE_DEV_SIGNER=true 
SOLO PARA E2E (clave de cuenta local de 
Anvil/Hardhat) 
VITE_TEST_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784
 d7bf4f2ff80 
/apps/governance-ui/src/eth.ts 
```ts 
import { BrowserProvider, Eip1193Provider, JsonRpcProvider, Wallet } 
from "ethers"; 
export type SignerBundle = 
| { type: "browser"; provider: BrowserProvider } 
| { type: "dev"; provider: JsonRpcProvider; wallet: Wallet }; 
export async function getSigner(): Promise<SignerBundle> { 
const forceDev = import.meta.env.VITE_FORCE_DEV_SIGNER === "true"; 
const rpc = import.meta.env.VITE_RPC_URL as string; 
const pk  = import.meta.env.VITE_TEST_PRIVATE_KEY as string; 
const eth = (globalThis as any).ethereum as Eip1193Provider | 
undefined; 
if (!forceDev && eth) { 
const bp = new BrowserProvider(eth); 
await eth.request?.({ method: "eth_requestAccounts" }); 
return { type: "browser", provider: bp }; 
} 
const provider = new JsonRpcProvider(rpc); 
const wallet = new Wallet(pk, provider); 
return { type: "dev", provider, wallet }; 
} 
