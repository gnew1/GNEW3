import { task } from "hardhat/config"; 
task("deploy:token", "Deploy utility token").setAction(async (_, hre) 
=> { 
await hre.run("run", { script: "scripts/deploy-token.ts" }); 
}); 
task("deploy:gov", "Deploy governance token").setAction(async (_, hre) 
=> { 
await hre.run("run", { script: "scripts/deploy-gov.ts" }); 
}); 
task("deploy:gov:uups", "Deploy governance token 
(UUPS)").setAction(async (_, hre) => { 
await hre.run("run", { script: "scripts/deploy-gov-uups.ts" }); 
}); 
task("deploy:staking", "Deploy StakingManager").setAction(async (_, 
hre) => { 
await hre.run("run", { script: "scripts/deploy-staking.ts" }); 
}); 
task("verify:addr", "Verify arbitrary address") 
.addParam("address", "Contract address") 
.addOptionalParam("args", "JSON array of constructor args", "[]") 
.setAction(async ({ address, args }, hre) => { 
await hre.run("verify:verify", { address, constructorArguments: 
JSON.parse(args) }); 
}); 
task("addressbook:print", "Print last deployments").setAction(async 
(_, hre) => { 
const book = await import("../scripts/lib/addressbook"); 
console.log(require("fs").readFileSync(require("path").join(__dirname, 
"..", "addressbook", "addressbook.json"), "utf8")); 
}); 
task("release:tag", "Crea tag git con versión y red") 
.addOptionalParam("prefix", "prefijo de tag", "deploy") 
.setAction(async ({ prefix }, hre) => { 
const pkg = require("../package.json"); 
    const net = hre.network.name; 
    const tag = `${prefix}/v${pkg.version}-${net}`; 
    const { execSync } = require("child_process"); 
    execSync(`git tag -a ${tag} -m "Release ${tag}" && git push origin 
${tag}`, { stdio: "inherit" }); 
  }); 
 
Asegúrate de importar los tasks en 
packages/contracts/hardhat.config.ts: 
import "./tasks/deploy"; 
 
