import { ethers } from "hardhat"; 
 
async function main() { 
  const [deployer] = await ethers.getSigners(); 
  const dao = process.env.DAO_KILL || deployer.address; 
 
  const Vault = await ethers.getContractFactory("StrategyVault"); 
  const vault = await Vault.deploy(dao); 
  await vault.waitForDeployment(); 
 
  console.log("StrategyVault:", await vault.getAddress()); 
  // Recuerda registrar routers y keepers: 
  // await vault.setRouter(<router>, true); await 
vault.setKeeper(<keeper>, true); 
} 
 
main().catch((e) => { console.error(e); process.exit(1); }); 
 
 
