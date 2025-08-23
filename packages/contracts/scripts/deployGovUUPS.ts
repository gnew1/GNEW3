/** 
 * Despliegue del GnewGovTokenUUPS con proxy UUPS (opcional). 
 * Requiere variables .env como en deployGov.ts 
 */ 
import "dotenv/config"; 
import { ethers, upgrades, network, run } from "hardhat"; 
 
async function main() { 
  const admin = process.env.OWNER_ADDRESS; 
  if (!admin) throw new Error("OWNER_ADDRESS no definido"); 
 
  const name = process.env.TOKEN_NAME || "GNEW-GOV"; 
  const symbol = process.env.TOKEN_SYMBOL || "gGNEW"; 
  const initial = BigInt(process.env.INITIAL_SUPPLY || "0"); 
  const cap = BigInt(process.env.MAX_SUPPLY || "0"); 
  const faucetAmount = BigInt(process.env.FAUCET_AMOUNT || "0"); 
  const faucetCooldown = Number(process.env.FAUCET_COOLDOWN || 
"86400"); 
 
  const F = await ethers.getContractFactory("GnewGovTokenUUPS"); 
  const proxy = await upgrades.deployProxy( 
    F, 
    [name, symbol, admin, initial, cap, faucetAmount, faucetCooldown], 
    { initializer: "initialize", kind: "uups" } 
  ); 
  await proxy.waitForDeployment(); 
 
  const address = await proxy.getAddress(); 
  console.log(`GnewGovTokenUUPS (proxy) @ ${address} 
(network=${network.name})`); 
 
  // Verify implementation (if explorer supports) 
  const impl = await 
upgrades.erc1967.getImplementationAddress(address); 
  console.log(`Implementation @ ${impl}`); 
 
  if (["holesky", "goerli", "polygonAmoy"].includes(network.name)) { 
    try { 
      await run("verify:verify", { address: impl, 
constructorArguments: [] }); 
      console.log("✓ Impl verificada"); 
    } catch (e) { 
      console.warn("No verificado automáticamente:", e); 
    } 
  } 
} 
 
main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
}); 
 
