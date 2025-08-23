import { expect } from "chai"; 
import { ethers } from "hardhat"; 
 
describe("SocialRecoveryController", () => { 
  it("N-of-M + timelock + finalize", async () => { 
    const [owner, g1, g2, g3, proposer, newcomer] = await 
ethers.getSigners(); 
 
    // Mock account (IRecoverable) 
    const Mock = await ethers.getContractFactory(` 
      // SPDX-License-Identifier: MIT 
      pragma solidity ^0.8.24; 
      contract MockAccount { 
        address public owner; 
        constructor(address o){ owner=o; } 
        function setOwner(address n) external { 
require(msg.sender==address(controller),"only controller"); owner=n; } 
        address public controller; 
        function setController(address c) external { 
require(msg.sender==owner,"only owner"); controller=c; } 
      }`); 
    const acc = await Mock.deploy(await owner.getAddress()); 
    await acc.waitForDeployment(); 
 
    const GM = await ethers.getContractFactory("GuardianManager"); 
    const gm = await GM.deploy(await owner.getAddress(), [await 
g1.getAddress(), await g2.getAddress(), await g3.getAddress()], 2); 
    await gm.waitForDeployment(); 
 
    const SRC = await 
ethers.getContractFactory("SocialRecoveryController"); 
    const src = await SRC.deploy(gm.getAddress(), acc.getAddress()); 
    await src.waitForDeployment(); 
 
    await (await 
acc.connect(owner).setController(src.getAddress())).wait(); 
 
    const nonce = await (await 
src.connect(proposer).proposeOnchain(await newcomer.getAddress(), 
"ipfs://evidence")).then(tx=>tx.wait()).then(()=>src.recoveryNonce()); 
    await (await src.connect(g1).approveOnchain(nonce)).wait(); 
    await (await src.connect(g2).approveOnchain(nonce)).wait(); 
    const r = await src.getRecovery(nonce); 
    expect(r[2]).to.gt(0n); // eta set 
 
    // avanza tiempo 
    await ethers.provider.send("evm_increaseTime",[2*24*3600]); await 
ethers.provider.send("evm_mine",[]); 
 
await (await src.connect(proposer).finalize(nonce)).wait(); 
// nuevo owner aplicado vía MockAccount.setOwner en finalize() 
// (nota: en este mock setOwner requiere controller; adaptado 
arriba) 
}); 
it("cancel por owner", async () => { 
// similar al anterior: proponer, luego cancel por owner y 
verificar que finalize falla 
}); 
}); 
Runbooks (extracto) 
● Alta/baja de guardians 
○ Owner ejecuta addGuardian/removeGuardian → aplica churnDelay antes 
de un nuevo cambio. 
○ Actualiza threshold (N) respetando N ≤ M y delay. 
● Recuperación (proceso recomendado) 
○ Soporte abre ticket y verifica identidad (DID/VC, N121–N122). 
○ Backend genera EIP‑712 ApproveRecovery (nonce próximo) y envía a 
guardians. 
○ Recibe ≥N firmas, llama proposeWithSignatures(...) → inicia timelock. 
○ Pass de espera (visibilidad UI). 
○ finalize(nonce) (patrocinable por Paymaster N120) → rota owner. 
○ Post‑acción: rotación de claves, revisar guardians y subir churnDelay 
temporalmente. 
● Cancelación/abuso 
○ El owner actual puede cancel(...). 
○ O N‑of‑M guardians con EIP‑712 cancelan, registrando reason. 
○ Activar lockdown en la dApp: si hay eta futuro, limitar acciones sensibles. 
● Auditoría 
○ Guardar evidenceURI (IPFS) con hashes de comunicación (no PII). 
○ Alertas si >3 recuperaciones/semana o si cambios de guardianes son 
frecuentes. 
Seguridad y extensiones 
● EIP‑1271: si un guardian es smart wallet, el servicio valida firmas contractuales y las 
“envuelve” (lista de guardianes puede ser DIDs → controller on‑chain). 
● Rate‑limit: una recuperación activa por cuenta; cooldown tras finalizar. 
● Identidad/VC/SBT: opcionalmente exigir que los guardians posean VC/SBT 
VerifiedHuman (N122–N123). 
● AA/EIP‑4337: integrar como Módulo (ERC‑6900) del smart account; finalize se 
ejecuta vía userOp patrocinado (N120). 
● Reentrancia: nonReentrant en puntos críticos; llamadas controladas a 
account.setOwner. 
