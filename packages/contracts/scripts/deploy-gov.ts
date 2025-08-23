import "dotenv/config"; 
import { ethers, network, run } from "hardhat"; 
import { appendDeployment } from "./lib/addressbook"; 
 
async function main() { 
  const admin = process.env.OWNER_ADDRESS!; 
  const name = process.env.TOKEN_NAME || "GNEW-GOV"; 
  const symbol = process.env.TOKEN_SYMBOL || "gGNEW"; 
  const initial = BigInt(process.env.INITIAL_SUPPLY || "0"); 
  const cap = BigInt(process.env.MAX_SUPPLY || "0"); 
  const faucetAmount = BigInt(process.env.FAUCET_AMOUNT || "0"); 
  const faucetCooldown = Number(process.env.FAUCET_COOLDOWN || "0"); 
  if (!admin) throw new Error("OWNER_ADDRESS requerido"); 
 
  const F = await ethers.getContractFactory("GnewGovToken"); 
  const c = await F.deploy(name, symbol, admin, initial, cap, 
faucetAmount, faucetCooldown); 
  const rc = await c.deploymentTransaction()?.wait(); 
  const address = await c.getAddress(); 
  console.log(`✓ GnewGovToken @ ${address}`); 
 
  if (!["hardhat", "anvil"].includes(network.name)) { 
    try { 
      await run("verify:verify", { 
        address, 
        constructorArguments: [name, symbol, admin, initial, cap, 
faucetAmount, faucetCooldown] 
      }); 
      console.log("✓ Verificado en explorer"); 
    } catch (e) { 
      console.warn("! No verificado automáticamente:", (e as 
Error).message); 
    } 
  } 
 
  appendDeployment({ 
    name: "GnewGovToken", 
    address, 
    txHash: rc!.hash, 
    chainId: (await ethers.provider.getNetwork()).chainId, 
    network: network.name, 
    block: rc!.blockNumber!, 
    impl: null, 
    timestamp: new Date().toISOString(), 
    artifact: "src/governance/GnewGovToken.sol/GnewGovToken.json", 
    constructorArgs: [name, symbol, admin, initial, cap, faucetAmount, 
faucetCooldown] 
  }); 
} 
 
main().catch((e) => (console.error(e), process.exit(1))); 
 
