import { defineConfig } from "cypress"; 
import { ethers } from "ethers"; 
 
export default defineConfig({ 
  e2e: { 
    baseUrl: "http://localhost:5173", 
    setupNodeEvents(on, config) { 
      on("task", { 
        async deployFixture() { 
          const rpc = process.env.VITE_RPC_URL || 
"http://127.0.0.1:8545"; 
          const pk  = process.env.VITE_TEST_PRIVATE_KEY || 
            
"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; 
          const provider = new ethers.JsonRpcProvider(rpc); 
          const w = new ethers.Wallet(pk, provider); 
 
          // Usa artefactos compilados del monorepo (requiere pnpm 
build en @gnew/contracts) 
          const Token = (await 
import("@gnew/contracts/artifacts/src/governance/mocks/TokenVotesMock.
 sol/TokenVotesMock.json", { assert: { type: "json" } })) as any; 
          const Rep   = (await 
import("@gnew/contracts/artifacts/src/reputation/ReputationScore.sol/R
 eputationScore.json", { assert: { type: "json" } })) as any; 
          const TL    = (await 
import("@openzeppelin/contracts/build/contracts/TimelockController.jso
 n", { assert: { type: "json" } })) as any; 
          const Gov   = (await 
import("@gnew/contracts/artifacts/src/governance/GnewGovernorTimelocke
 d.sol/GnewGovernorTimelocked.json", { assert: { type: "json" } })) as 
any; 
 
          async function deploy(abi: any, bytecode: string, args: 
any[] = []) { 
            const factory = new ethers.ContractFactory(abi, bytecode, 
w); 
            const c = await factory.deploy(...args); 
            await c.waitForDeployment(); 
            return c.getAddress(); 
          } 
 
          const token = await deploy(Token.default.abi, 
Token.default.bytecode); 
          const rep = await deploy(Rep.default.abi, 
Rep.default.bytecode, [w.address, w.address]); 
          const minDelay = 60n; 
          const timelock = await deploy(TL.default.abi, 
TL.default.bytecode, [minDelay, [], [w.address], w.address]); 
 
          // delega votos 
          const tok = new ethers.Contract(token, Token.default.abi, 
w); 
          await (await tok.mint(w.address, ethers.parseUnits("100", 
18))).wait(); 
          await (await tok.delegate(w.address)).wait(); 
 
          const repC = new ethers.Contract(rep, Rep.default.abi, w); 
          await (await repC.delegate(w.address)).wait(); 
          await (await repC.setScore(w.address, 50)).wait(); 
 
          const gov = await deploy( 
            Gov.default.abi, Gov.default.bytecode, 
            [token, rep, 7000, 3000, 400, 1, 5, 0, timelock] 
          ); 
 
          // roles timelock (proposer=governor) 
          const tl = new ethers.Contract(timelock, TL.default.abi, w); 
          const PROPOSER_ROLE = await tl.PROPOSER_ROLE(); 
          const EXECUTOR_ROLE = await tl.EXECUTOR_ROLE(); 
          await (await tl.grantRole(PROPOSER_ROLE, gov)).wait(); 
          await (await tl.grantRole(EXECUTOR_ROLE, 
ethers.ZeroAddress)).wait(); 
 
          return { token, rep, timelock, gov }; 
        } 
      }); 
      return config; 
    }, 
    defaultCommandTimeout: 20000, 
    video: false 
  } 
}); 
 
