import "dotenv/config"; 
import { ethers, network, run } from "hardhat"; 
import { appendDeployment } from "./lib/addressbook"; 
async function main() { 
const owner = process.env.OWNER_ADDRESS!; 
const name = process.env.TOKEN_NAME || "GNEW"; 
  const symbol = process.env.TOKEN_SYMBOL || "GNEW"; 
  const initial = BigInt(process.env.INITIAL_SUPPLY || "0"); 
  if (!owner) throw new Error("OWNER_ADDRESS requerido"); 
 
  const F = await ethers.getContractFactory("GnewToken"); 
  const c = await F.deploy(name, symbol, owner, initial); 
  const receipt = await c.deploymentTransaction()?.wait(); 
  const address = await c.getAddress(); 
 
  console.log(`✓ GnewToken @ ${address} (tx=${receipt?.hash})`); 
 
  // verify 
  if (!["hardhat", "anvil"].includes(network.name)) { 
    try { 
      await run("verify:verify", { 
        address, 
        constructorArguments: [name, symbol, owner, initial] 
      }); 
      console.log("✓ Verificado en explorer"); 
    } catch (e) { 
      console.warn("! No verificado automáticamente:", (e as 
Error).message); 
    } 
  } 
 
  appendDeployment({ 
    name: "GnewToken", 
    address, 
    txHash: receipt!.hash, 
    chainId: (await ethers.provider.getNetwork()).chainId, 
    network: network.name, 
    block: receipt!.blockNumber!, 
    impl: null, 
    timestamp: new Date().toISOString(), 
    artifact: "src/GnewToken.sol/GnewToken.json", 
    constructorArgs: [name, symbol, owner, initial] 
  }); 
} 
 
main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
}); 
 
