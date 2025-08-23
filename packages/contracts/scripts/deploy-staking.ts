import "dotenv/config"; 
import { ethers, network, run } from "hardhat"; 
import { appendDeployment } from "./lib/addressbook"; 
 
async function main() { 
  const token = process.env.GOV_TOKEN_ADDRESS!; 
  const admin = process.env.ADMIN_ADDRESS!; 
  const receiver = process.env.SLASH_RECEIVER!; 
  const minStake = BigInt(process.env.MIN_OPERATOR_STAKE || "0"); 
  const unbond = Number(process.env.UNBONDING_WINDOW || "3600"); 
  const delay = Number(process.env.SLASH_DELAY || "1800"); 
  if (!token || !admin || !receiver) throw new Error("ENV incompletas 
(GOV_TOKEN_ADDRESS/ADMIN/SLASH_RECEIVER)"); 
 
  const F = await ethers.getContractFactory("StakingManager"); 
  const c = await F.deploy(token, admin, receiver, minStake, unbond, 
delay); 
  const rc = await c.deploymentTransaction()?.wait(); 
  const address = await c.getAddress(); 
  console.log(`✓ StakingManager @ ${address}`); 
 
  // (contrato sin verificación por defecto; si aplica, usa verify 
vacío) 
  try { 
    if (!["hardhat", "anvil"].includes(network.name)) { 
      await run("verify:verify", { 
        address, 
        constructorArguments: [token, admin, receiver, minStake, 
unbond, delay] 
      }); 
      console.log("✓ Verificado en explorer"); 
    } 
  } catch (e) { 
    console.warn("! No verificado automáticamente:", (e as 
Error).message); 
  } 
 
  appendDeployment({ 
    name: "StakingManager", 
    address, 
    txHash: rc!.hash, 
    chainId: (await ethers.provider.getNetwork()).chainId, 
    network: network.name, 
    block: rc!.blockNumber!, 
    impl: null, 
    timestamp: new Date().toISOString(), 
    artifact: "src/staking/StakingManager.sol/StakingManager.json", 
    constructorArgs: [token, admin, receiver, minStake, unbond, delay] 
  }); 
} 
 
main().catch((e) => (console.error(e), process.exit(1))); 
 
