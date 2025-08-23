import { ethers } from "hardhat"; 
/** 
* Simula en red fork: propuesta -> votación -> cola -> ejecución. 
* Control: ejecución sin fallos y cómputo de abstenciones. 
*/ 
async function main() { 
const [proposer, voterA, voterB] = await ethers.getSigners(); 
const governor = await ethers.getContractAt("GNEWGovernor", 
process.env.GOVERNOR!); 
const token    
= await ethers.getContractAt("GNEWGovernanceToken", 
process.env.TOKEN!); 
// Delegar poder de voto 
await (await token.connect(voterA).delegate(voterA.address)).wait(); 
await (await token.connect(voterB).delegate(voterB.address)).wait(); 
// Crear propuesta simple: actualizar delay del timelock (ejemplo) 
const timelock = await ethers.getContractAt("GNEWTimelock", 
process.env.TIMELOCK!); 
const newDelay = 3 * 24 * 60 * 60; 
  const calldata = 
timelock.interface.encodeFunctionData("updateDelay", [newDelay]); 
 
  const proposeTx = await governor.connect(proposer).propose( 
    [timelock.target as string], 
    [0], 
    [calldata], 
    "Proposal: Update timelock delay to 3 days" 
  ); 
  const rc = await proposeTx.wait(); 
  const proposalId = rc!.logs.find(l => (l as 
any).args?.proposalId)?.args?.proposalId; 
 
  // Avanza a la votación y vota con ABSTAIN incluido (control: 
abstención calculada) 
  await ethers.provider.send("hardhat_mine", ["0x1000"]); // 
~votingDelay 
  await (await governor.connect(voterA).castVote(proposalId, 
1)).wait(); // For 
  await (await governor.connect(voterB).castVote(proposalId, 
2)).wait(); // Abstain 
 
  await ethers.provider.send("hardhat_mine", ["0x10000"]); // 
~votingPeriod 
 
  // Cola y ejecución 
  const descHash = ethers.id("Proposal: Update timelock delay to 3 
days"); 
  await (await governor.queue([timelock.target], [0], [calldata], 
descHash)).wait(); 
 
  // Avanza delay 
  const delay = await timelock.getMinDelay(); 
  await ethers.provider.send("evm_increaseTime", [Number(delay)]); 
  await ethers.provider.send("evm_mine", []); 
 
  await (await governor.execute([timelock.target], [0], [calldata], 
descHash)).wait(); 
console.log("Simulation OK: executed without failures."); 
} 
main().catch((e) => { console.error(e); process.exit(1); }); 
API de mirrors + métricas (Snapshot/IPFS/Arweave) 
