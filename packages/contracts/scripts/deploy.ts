/** 
 * Despliegue uniforme via Hardhat. 
 * Redes: anvil, goerli, holesky, polygonAmoy (config en 
hardhat.config.ts) 
 */ 
import "dotenv/config"; 
import { ethers, network, run } from "hardhat"; 
 
async function main() { 
  const name = process.env.TOKEN_NAME || "GNEW"; 
  const symbol = process.env.TOKEN_SYMBOL || "GNEW"; 
  const owner = process.env.OWNER_ADDRESS; 
  const initial = process.env.INITIAL_SUPPLY || "0"; 
 
  if (!owner) throw new Error("OWNER_ADDRESS no definido en .env"); 
 
  console.log(`Desplegando GnewToken a '${network.name}'...`); 
  const factory = await ethers.getContractFactory("GnewToken"); 
  const contract = await factory.deploy(name, symbol, owner, initial); 
  await contract.waitForDeployment(); 
 
  const address = await contract.getAddress(); 
  console.log(`GnewToken @ ${address}`); 
 
  // Intento de verificación (si aplica) 
  if (["goerli", "holesky", "polygonAmoy"].includes(network.name)) { 
    console.log("Verificando en explorer..."); 
    try { 
      await run("verify:verify", { 
        address, 
        constructorArguments: [name, symbol, owner, initial] 
      }); 
      console.log("✓ Verificado"); 
    } catch (e) { 
      console.warn("No se pudo verificar automáticamente:", e); 
    } 
  } 
} 
 
main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
}); 
 
