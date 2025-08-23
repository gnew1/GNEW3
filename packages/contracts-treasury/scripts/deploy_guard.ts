import { ethers } from "hardhat"; 
 
async function main() { 
  const SAFE = process.env.SAFE!; 
  const GUARDIAN = process.env.GUARDIAN!; 
  if (!SAFE || !GUARDIAN) throw new Error("SAFE and GUARDIAN env 
required"); 
 
  const Guard = await 
ethers.getContractFactory("TreasuryPolicyGuard"); 
  const guard = await Guard.deploy(SAFE, GUARDIAN); 
await guard.waitForDeployment(); 
console.log("TreasuryPolicyGuard deployed at:", await 
guard.getAddress()); 
// Example baseline caps and settings 
const tx1 = await guard.setNativeCap( 
ethers.id("operativo"), 
ethers.id("FINANCE_OPS"), 
ethers.parseEther("50") 
); 
await tx1.wait(); 
const tx2 = await guard.setTimeWindow(8, 20); 
await tx2.wait(); 
console.log("Initial config set"); 
} 
main().catch((e) => { 
console.error(e); 
process.exit(1); 
}); 
