/** 
 * Despliegue del GnewGovToken (no proxy) 
 * Requiere: OWNER_ADDRESS, INITIAL_SUPPLY, MAX_SUPPLY, FAUCET_AMOUNT, 
FAUCET_COOLDOWN, TOKEN_NAME, TOKEN_SYMBOL 
 */ 
import "dotenv/config"; 
import { ethers, network, run } from "hardhat"; 
 
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
 
  const f = await ethers.getContractFactory("GnewGovToken"); 
  const c = await f.deploy(name, symbol, admin, initial, cap, 
faucetAmount, faucetCooldown); 
  await c.waitForDeployment(); 
 
  const address = await c.getAddress(); 
  console.log(`GnewGovToken @ ${address} (network=${network.name})`); 
 
  if (["holesky", "goerli", "polygonAmoy"].includes(network.name)) { 
    try { 
      await run("verify:verify", { 
        address, 
        constructorArguments: [name, symbol, admin, initial, cap, 
faucetAmount, faucetCooldown] 
      }); 
      console.log("✓ Verificado"); 
    } catch (e) { 
      console.warn("No verificado automáticamente:", e); 
    } 
  } 
} 
 
main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
}); 
 
