/** 
 * Rollback (UUPS): vuelve a la implementación anterior registrada en 
el addressbook, 
 * programando el cambio vía UpgradeGovernor + Timelock (seguro). 
 */ 
import "dotenv/config"; 
import { ethers } from "hardhat"; 
import { findLast } from "./lib/addressbook"; 
 
async function main() { 
  const proxy = process.env.PROXY_ADDRESS!; 
  const ug = process.env.UPGRADE_GOVERNOR!; 
  const chainId = (await ethers.provider.getNetwork()).chainId; 
 
  const last = findLast("GnewGovTokenUUPS", Number(chainId)); 
  if (!last?.impl) throw new Error("No impl previa en addressbook para 
este proxy/red"); 
const governor = await ethers.getContractAt("UpgradeGovernor", ug); 
const salt = ethers.id("rollback-" + Date.now().toString()); 
const tx = await governor.scheduleUpgrade(proxy, last.impl, "0x", 
ethers.ZeroHash, salt); 
console.log("Rollback scheduled:", (await tx.wait())?.hash); 
} 
main().catch((e) => (console.error(e), process.exit(1))); 
