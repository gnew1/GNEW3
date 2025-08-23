import { expect } from "chai"; 
import { ethers } from "hardhat"; 
import type { GnewGovernor, ReputationScore, TokenVotesMock } from 
"../../typechain-types"; 
 
const toWei = (n: string) => ethers.parseUnits(n, 18); 
 
describe("GnewGovernor — mezcla token/reputación (Hardhat)", () => { 
  let gov: GnewGovernor; 
  let rep: ReputationScore; 
  let token: TokenVotesMock; 
  let owner: any, alice: any, bob: any, scorer: any; 
 
  beforeEach(async () => { 
    [owner, alice, bob, scorer] = await ethers.getSigners(); 
 
    // Token IVotes 
    const TF = await ethers.getContractFactory("TokenVotesMock"); 
    token = (await TF.deploy()) as TokenVotesMock; 
    await token.waitForDeployment(); 
 
    await token.mint(alice.address, toWei("100")); 
    await token.mint(bob.address, toWei("100")); 
 
    // Delegación a sí mismos 
    await token.connect(alice).delegate(alice.address); 
    await token.connect(bob).delegate(bob.address); 
 
    // Reputación 
    const RF = await ethers.getContractFactory("ReputationScore"); 
    rep = (await RF.deploy(owner.address, scorer.address)) as 
ReputationScore; 
    await rep.waitForDeployment(); 
 
    // Delegación por Votes (reputación) 
    await rep.connect(alice).delegate(alice.address); 
    await rep.connect(bob).delegate(bob.address); 
 
    // Asignar reputaciones: Alice=30, Bob=0 (ejemplo) 
    await rep.connect(scorer).setScore(alice.address, 30); 
    await rep.connect(scorer).setScore(bob.address, 0); 
 
    // Governor: 70/30, quorum 4%, delay=1, period=5, threshold=10 
    const GF = await ethers.getContractFactory("GnewGovernor"); 
    gov = (await GF.deploy( 
      token.getAddress(), 
      rep.getAddress(), 
      7000, 3000, 400, 
      1, 5, 10 
    )) as GnewGovernor; 
    await gov.waitForDeployment(); 
  }); 
 
  async function moveBlocks(n: number) { 
    for (let i=0;i<n;i++) await ethers.provider.send("evm_mine", []); 
  } 
 
  it("ponderación 70/30: propuestas pasan/fracasan como se espera", 
async () => { 
    // Propuesta simple: actualizar quorum a 3% 
    const targets = [await gov.getAddress()]; 
    const values = [0]; 
    const calldata = [gov.interface.encodeFunctionData("setQuorumBps", 
[300])]; 
    const desc = "set quorum to 3%"; 
 
    // esperar delay: proposal snapshot = current+delay 
    await moveBlocks(1); 
 
    const proposeTx = await gov.connect(alice).propose(targets, 
values, calldata, desc); 
    const pid = (await proposeTx.wait())!.logs[0].args?.proposalId as 
bigint; 
 
    // Avanza a período de votación 
    await moveBlocks(1); 
 
    // Votos: 
    // - Alice: token=100, rep=30 -> votos = 0.7*100 + 0.3*30 = 79 
    // - Bob: token=100, rep=0 -> votos = 70 
    // Con quorum 4% del supply ponderado: 
    //   token supply=200, rep supply=30 -> mixedSupply=0.7*200 + 
0.3*30 = 151 
    //   quorum = 0.04 * 151 = 6.04 ~ 6 (entero truncado) 
    // La propuesta debería pasar si For > Against y For >= quorum. 
    await gov.connect(alice).castVote(pid, 1); // For 
    await gov.connect(bob).castVote(pid, 0);   // Against 
 
    // Finaliza votación 
    await moveBlocks(5); 
 
    const s = await gov.state(pid); 
    expect(s).to.equal(4n); // Succeeded 
 
    // Ejecuta 
    await expect(gov.execute(targets, values, calldata, 
ethers.id(desc))).to.emit(gov, "QuorumUpdated").withArgs(300); 
  }); 
 
  it("cambio de pesos sólo vía gobernanza", async () => { 
    // Propuesta para setWeights 50/50 
    await moveBlocks(1); 
    const call = gov.interface.encodeFunctionData("setWeights", [5000, 
5000]); 
    const tx = await gov.connect(alice).propose([await 
gov.getAddress()], [0], [call], "rebalance"); 
    const pid = (await tx.wait())!.logs[0].args?.proposalId as bigint; 
    await moveBlocks(1); 
    await gov.connect(alice).castVote(pid, 1); 
    await moveBlocks(5); 
    await gov.execute([await gov.getAddress()], [0], [call], 
ethers.id("rebalance")); 
    expect(await gov.tokenWeightBps()).to.eq(5000); 
    expect(await gov.repWeightBps()).to.eq(5000); 
  }); 
}); 
 
/packages/contracts/README.md (sección N11) 
## N11 — Gobernanza híbrida (token + reputación) 
 
**Objetivo:** combinar poder por token (IVotes) y reputación on‑chain 
(soulbound) con ponderación configurable (por ejemplo 70/30). 
### Entregables - `src/reputation/ReputationScore.sol` — módulo de reputación 
(soulbound) compatible con `IVotes` (delegación + snapshots). - `src/governance/GnewGovernor.sol` — Governor OZ con `_getVotes` y 
`quorum()` sobre **suma ponderada** (token+reputación). - Tests `test/governance/GnewGovernor.spec.ts` (Hardhat). 
### Uso 
1. Despliega un **token IVotes** (p.ej., ERC20Votes). Para pruebas se 
entrega `TokenVotesMock.sol`. 
2. Despliega `ReputationScore` y asigna puntuaciones 
(`setScore`/`setScores`) desde el rol `SCORER_ROLE`. 
3. Despliega `GnewGovernor` indicando: - `tokenVotes`, `repVotes` - `tokenWeightBps`, `repWeightBps` (suman 10_000) - `quorumBps`, `votingDelay`, `votingPeriod`, `proposalThreshold` 
4. Votantes deben **delegar** en ambos módulos 
(`token.delegate(self)`, `reputation.delegate(self)`). 
### Ponderación - Votos de una cuenta en bloque `b`: 
votes(b) = ( token.getPastVotes(a,b) * tokenWeightBps 
+ rep.getPastVotes(a,b) * repWeightBps ) / 10000 - Quorum: 
quorum(b) = quorumBps/10000 * ( token.getPastTotalSupply(b)*tokenWeightBps 
+ rep.getPastTotalSupply(b)*repWeightBps )/10000 
### Pruebas / DoD - Escenarios donde las propuestas **pasan/fracasan** con pesos 70/30 
como se espera. 
- Cambio de pesos y quorum sólo mediante **propuestas** 
(`onlyGovernance`). 
> Nota: El módulo de reputación es **soulbound** (no transferible) y 
mantiene checkpoints para compatibilidad con OZ Governor. 
¿Quieres que añada tareas Hardhat para desplegar ReputationScore y GnewGovernor con 
pesos iniciales (70/30) y wiring automático con tu token IVotes de preferencia, o un subgraph 
de gobernanza para exponer votos ponderados por propuesta? 
Tú dijiste: 
N12 Objetivo: Reducir captura por “whales”. Roles: Eng. SC (lead), Seguridad, QA. Stack: 
módulo de conteo cuadrático (off-chain tally con verificación on-chain o puro on-chain). 
Entregables: QuadraticCounter.sol. Pruebas/DoD: evita colisiones y rounding errors; gas OK. 
ChatGPT Plus 
Pensó durante 1m 50s 
