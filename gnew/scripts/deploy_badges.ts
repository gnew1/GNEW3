import { ethers } from "hardhat"; 
 
async function main() { 
  const [deployer, admin] = await ethers.getSigners(); 
 
  const SBT = await ethers.getContractFactory("GnewSoulboundBadges"); 
  const sbt = await SBT.deploy(admin.address, "GNEW Soulbound", 
"GSBT", "ipfs://badges/"); 
  await sbt.waitForDeployment(); 
 
  console.log("GnewSoulboundBadges:", await sbt.getAddress()); 
 
  // Opcional: claimer 
  const Claimer = await ethers.getContractFactory("GnewSBTClaimer"); 
  const claimer = await Claimer.deploy(admin.address, 
sbt.getAddress()); 
  await claimer.waitForDeployment(); 
  console.log("GnewSBTClaimer:", await claimer.getAddress()); 
 
  // roles iniciales 
  const MINTER_ROLE = await sbt.MINTER_ROLE(); 
  await (await sbt.connect(admin).grantRole(MINTER_ROLE, await 
admin.getAddress())).wait(); 
} 
main().catch((e) => { console.error(e); process.exit(1); }); 
 
 
