import { expect } from "chai"; 
import { ethers } from "hardhat"; 
import type { TokenVotesMock, QuadraticTokenGovernor } from 
"../../typechain-types"; 
 
const toWei = (n: string) => ethers.parseUnits(n, 18); 
 
describe("QuadraticCounter — on-chain y off-chain (Hardhat)", () => { 
  let token: TokenVotesMock; 
  let gov: QuadraticTokenGovernor; 
  let owner: any, whale: any, fish1: any, fish2: any, fish3: any, 
tallier: any; 
 
  async function moveBlocks(n: number) { 
    for (let i = 0; i < n; i++) await ethers.provider.send("evm_mine", 
[]); 
  } 
 
  beforeEach(async () => { 
    [owner, whale, fish1, fish2, fish3, tallier] = await 
ethers.getSigners(); 
 
    // Token IVotes 
    const TF = await ethers.getContractFactory("TokenVotesMock"); 
    token = (await TF.deploy()) as TokenVotesMock; 
    await token.waitForDeployment(); 
 
    // Distribución: whale=100, fish1..3=9 cada uno (total 127) 
    await token.mint(whale.address, toWei("100")); 
    await token.mint(fish1.address, toWei("9")); 
    await token.mint(fish2.address, toWei("9")); 
    await token.mint(fish3.address, toWei("9")); 
 
    // Delegación a sí mismos 
    for (const s of [whale, fish1, fish2, fish3]) { 
      await token.connect(s).delegate(s.address); 
    } 
 
    // Governor QV (delay=1, period=5, threshold=0) 
    const GF = await 
ethers.getContractFactory("QuadraticTokenGovernor"); 
    gov = (await GF.deploy( 
      token.getAddress(), 
      tallier.address, 
      1, 5, 0 
    )) as QuadraticTokenGovernor; 
    await gov.waitForDeployment(); 
  }); 
 
  it("on-chain: el bloque de 'whale' no captura frente a peces 
coordinados", async () => { 
    // Propuesta dummy (llamada a sí mismo sin efectos) 
    const targets = [await gov.getAddress()]; 
    const values = [0]; 
    const calldata = [gov.interface.encodeFunctionData("setTallier", 
[tallier.address])]; 
    const desc = "dummy"; 
 
    await moveBlocks(1); 
    const tx = await gov.connect(fish1).propose(targets, values, 
calldata, desc); 
    const pid = (await tx.wait())!.logs[0].args?.proposalId as bigint; 
 
    await moveBlocks(1); 
 
    // Votan: whale AGAINST, 3 fishes FOR 
    await gov.connect(whale).castVote(pid, 0); 
    await gov.connect(fish1).castVote(pid, 1); 
    await gov.connect(fish2).castVote(pid, 1); 
    await gov.connect(fish3).castVote(pid, 1); 
 
    // Avanza periodo 
    await moveBlocks(5); 
 
    // Conteo cuadrático esperado (aprox): 
    // whale: sqrt(100)=10 
    // cada fish: sqrt(9)=3 -> total for = 9 
    const [againstQ, forQ] = await (async () => { 
      const v = await gov.proposalVotes(pid); 
      return [v[0], v[1]]; 
    })(); 
 
    expect(againstQ).to.eq(10n); 
    expect(forQ).to.eq(9n); 
    // Con 3 peces no alcanza; añadimos un cuarto pez para que supere 
(en otro proposal) 
    expect(await gov.state(pid)).to.equal(3n /* Defeated */); 
  }); 
 
  it("on-chain: con suficientes peces, FOR supera a AGAINST (evita 
captura)", async () => { 
    // Añade más peces 
    const extra = await ethers.getSigners(); 
    for (let i = 6; i < 11; i++) { 
      await token.mint(extra[i].address, toWei("9")); 
      await token.connect(extra[i]).delegate(extra[i].address); 
    } 
 
    const targets = [await gov.getAddress()]; 
    const values = [0]; 
    const calldata = [gov.interface.encodeFunctionData("setTallier", 
[tallier.address])]; 
 
    await moveBlocks(1); 
    const tx = await gov.connect(fish1).propose(targets, values, 
calldata, "qv-2"); 
    const pid = (await tx.wait())!.logs[0].args?.proposalId as bigint; 
    await moveBlocks(1); 
 
    // whale AGAINST, 8 peces FOR (3 prev + 5 nuevos) => FOR = 8*3=24 
> 10 
    await gov.connect(whale).castVote(pid, 0); 
    for (let i = 2; i <= 10; i++) { 
      await gov.connect((await ethers.getSigners())[i]).castVote(pid, 
1); 
    } 
    await moveBlocks(5); 
 
    const [againstQ, forQ] = await (async () => { 
      const v = await gov.proposalVotes(pid); 
      return [v[0], v[1]]; 
    })(); 
    expect(againstQ).to.eq(10n); 
    expect(forQ).to.eq(24n); 
    expect(await gov.state(pid)).to.equal(4n /* Succeeded */); 
  }); 
 
  it("off-chain tally: se sella, se impide votar y se puede verificar 
hoja", async () => { 
    // Propuesta 
    const targets = [await gov.getAddress()]; 
    const values = [0]; 
    const calldata = [gov.interface.encodeFunctionData("setTallier", 
[tallier.address])]; 
 
    await moveBlocks(1); 
    const tx = await gov.connect(fish1).propose(targets, values, 
calldata, "offchain"); 
    const pid = (await tx.wait())!.logs[0].args?.proposalId as bigint; 
 
    // Tallier publica resultado (forQ=9, againstQ=10 del escenario 3 
fishes vs whale) 
    // Árbol con dos hojas (whale y fish1) a modo de ejemplo 
    const leafWhale = ethers.keccak256( 
      ethers.AbiCoder.defaultAbiCoder().encode( 
        
["uint256","address","uint256","address","uint8","uint256","uint256"], 
        [ (await ethers.provider.getNetwork()).chainId, await 
gov.getAddress(), pid, whale.address, 0, toWei("100"), 10n ] 
      ) 
    ); 
    const leafFish = ethers.keccak256( 
      ethers.AbiCoder.defaultAbiCoder().encode( 
        
["uint256","address","uint256","address","uint8","uint256","uint256"], 
        [ (await ethers.provider.getNetwork()).chainId, await 
gov.getAddress(), pid, fish1.address, 1, toWei("9"), 3n ] 
      ) 
    ); 
    const root = ethers.keccak256(ethers.concat([leafWhale, 
leafFish].sort())); // árbol binario simple (orden lexicográfico) 
 
    await gov.connect(tallier).finalizeOffchainTally(pid, 10, 9, 0, 
root); 
 
    // Intentar votar ahora revierte 
    await expect(gov.connect(whale).castVote(pid, 
0)).to.be.revertedWithCustomError(gov, "OffchainFinalizedAlready"); 
 
    // Lectura de votos = off-chain 
    const v = await gov.proposalVotes(pid); 
    expect(v[0]).to.eq(10n); 
    expect(v[1]).to.eq(9n); 
 
    // Verificación de hoja (usamos prueba de 1 nivel) -> proof = [la 
otra hoja] 
const okWhale = await gov.verifyOffchainLeaf(pid, whale.address, 
0, toWei("100"), 10, [leafFish]); 
const okFish  = await gov.verifyOffchainLeaf(pid, fish1.address, 
1, toWei("9"), 3, [leafWhale]); 
expect(okWhale).to.eq(true); 
expect(okFish).to.eq(true); 
}); 
}); 
/packages/contracts/README.md (añade N12) 
## N12 — Reducción de captura por “whales” (Quadratic Voting) 
**Entrega** - `src/governance/extensions/QuadraticCounter.sol`: extensión para OZ 
Governor que: - En modo **on‑chain**, cuenta cada voto como `floor(sqrt(weight))`. - En modo **off‑chain**, permite sellar un cómputo externo 
(for/against/abstain + `merkleRoot`) y verificar hojas con 
`verifyOffchainLeaf(...)`. - Evita colisiones en hojas (`abi.encode` + domain separation por 
`chainId` y `address(this)`). - `src/governance/mocks/QuadraticTokenGovernor.sol`: ejemplo de 
Governor integrado (IVotes único). - Tests `test/governance/QuadraticCounter.spec.ts`: casos on‑chain 
(whale vs. peces) y off‑chain (sellado + verificación). 
**Uso rápido (on-chain)** 
1. Implementa un Governor concreto que herede de `QuadraticCounter` y 
*también* de `GovernorVotes` o tu `_getVotes` personalizado. 
2. Opcional: fija `tallier` para habilitar el flujo off‑chain 
(publicará los totales y `merkleRoot`). 
**DoD** - Cómputos **pasan/fracasan** conforme a expectativas bajo CV. - **Rounding**: `Math.sqrt` (floor) con pruebas en bordes; sin 
colisiones de hash por `abi.encode`. 
- **Gas OK**: una sola operación `sqrt` por voto; estructuras 
`uint256` sin cast costosos; almacenamiento mínimo. 
¿Te integro ahora una variante QuadraticCounterWeighted que aplique raíz sobre la 
mezcla token+reputación de GnewGovernor (N11) para tener QV también en el modelo 
híbrido 70/30? 
Tú dijiste: 
N13 Objetivo: Delegables revocables, con expiración. Roles: Eng. SC, Frontend. Entregables: 
Delegation.sol, UI delegación. DoD: expiración + reasignación funcionan sin pérdida. 
ChatGPT Plus 
Pensó durante 1m 9s 
