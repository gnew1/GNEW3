import { expect } from "chai"; 
import { ethers } from "hardhat"; 
 
describe("PoC EVM<->EVM Bridge", function () { 
  it("lock -> mint (B) -> burn -> unlock (A) y prueba de fraude", 
async function () { 
    const [deployer, user, relayer, updater, challenger] = await 
ethers.getSigners(); 
 
    // --- Deploy light clients --- 
    const LC = await ethers.getContractFactory("LightClientBasic"); 
    const lcA = await LC.deploy(await deployer.getAddress()); 
    const lcB = await LC.deploy(await deployer.getAddress()); 
    await lcA.waitForDeployment(); await lcB.waitForDeployment(); 
 
    // Grant UPDATER_ROLE a updater (observador) 
    const UPDATER_ROLE = await lcA.UPDATER_ROLE(); 
    await lcA.grantRole(UPDATER_ROLE, await updater.getAddress()); 
    await lcB.grantRole(UPDATER_ROLE, await updater.getAddress()); 
 
    // --- Deploy messengers --- 
    const Messenger = await 
ethers.getContractFactory("BridgeMessenger"); 
    // Simulamos chainIds distintas dentro del mismo test 
    const CHAIN_A = 1001n; 
    const CHAIN_B = 1002n; 
    const mA = await Messenger.deploy(CHAIN_A, await 
deployer.getAddress()); 
    const mB = await Messenger.deploy(CHAIN_B, await 
deployer.getAddress()); 
    await mA.waitForDeployment(); await mB.waitForDeployment(); 
 
    // Config remotos (informativo) 
    await mA.setRemote(CHAIN_B, await mB.getAddress()); 
    await mB.setRemote(CHAIN_A, await mA.getAddress()); 
    await mA.grantRelayer(await relayer.getAddress()); 
    await mB.grantRelayer(await relayer.getAddress()); 
 
    // Parametrizamos ventana y bond pequeños para el test 
    await mA.setChallengePeriod(10); 
    await mB.setChallengePeriod(10); 
    await mA.setBondAmount(ethers.parseEther("0.01")); 
    await mB.setBondAmount(ethers.parseEther("0.01")); 
 
    // --- Deploy lockboxes --- 
    const Lockbox = await ethers.getContractFactory("BridgeLockbox"); 
    const lbA = await Lockbox.deploy(await deployer.getAddress(), 
mA.getAddress()); 
    const lbB = await Lockbox.deploy(await deployer.getAddress(), 
mB.getAddress()); 
    await lbA.waitForDeployment(); await lbB.waitForDeployment(); 
 
    // --- Tokens --- 
    const TestToken = await ethers.getContractFactory("TestToken"); 
    const tA = await TestToken.deploy(); 
    await tA.waitForDeployment(); 
    // Usuario recibirá tokens 
    await tA.mint(await user.getAddress(), ethers.parseEther("1000")); 
 
    // Wrapped en B 
    const Wrapped = await ethers.getContractFactory("WrappedERC20"); 
    const wB = await Wrapped.deploy("Wrapped TT", "wTT", await 
deployer.getAddress()); 
    await wB.waitForDeployment(); 
 
    // Config soportes 
    await lbA.setSupported(await tA.getAddress(), true); 
    await lbB.registerWrapped(CHAIN_A, await tA.getAddress(), await 
wB.getAddress()); 
 
    // --- Flujo: lock en A -> mint en B --- 
    // user aprueba y bloquea en A 
    await tA.connect(user).approve(await lbA.getAddress(), 
ethers.parseEther("50")); 
    const lockTx = await lbA.connect(user).bridgeERC20(await 
tA.getAddress(), ethers.parseEther("50"), CHAIN_B, await 
lbB.getAddress()); 
    const lockRc = await lockTx.wait(); 
 
    // parseamos evento MessageSent de mA 
    const mAiface = (await ethers.getArtifact("BridgeMessenger")).abi; 
    const mAcn = new ethers.Interface(mAiface); 
    const ev = lockRc!.logs 
      .map((l) => { try { return mAcn.parseLog({ topics: l.topics, 
data: l.data }) } catch { return null } }) 
      .find((x) => x && x!.name === "MessageSent")!; 
    const eventId = ev!.args[0] as string; 
    const eventHash = ev!.args[7] as string; 
    const nonce = ev!.args[5] as bigint; 
 
    // Construimos el Message exacto 
    const msgStruct = { 
      srcChainId: CHAIN_A, 
      dstChainId: CHAIN_B, 
      srcSender: await lbA.getAddress(), 
      dstReceiver: await lbB.getAddress(), 
      nonce, 
      data: ev!.args[6] as string 
    }; 
 
    // Updater publica "verdad" en LC_B y relayer somete el mensaje a 
mB 
    await lcB.connect(updater).updateEventHash(CHAIN_A, eventId, 
eventHash); 
    const bondB = await mB.bondAmount(); 
    await mB.connect(relayer).submitMessage(msgStruct, eventHash, { 
value: bondB }); 
 
    // Avanzamos tiempo y finalizamos 
    await ethers.provider.send("evm_increaseTime", [12]); 
    await ethers.provider.send("evm_mine"); 
    await mB.finalize(eventId, await lcB.getAddress()); 
 
    // Usuario debe tener wTT en B 
    expect(await wB.balanceOf(await 
user.getAddress())).to.equal(ethers.parseEther("50")); 
 
    // --- Flujo retorno: burn en B -> unlock en A --- 
    // user aprueba y solicita volver a origen 
    await wB.connect(user).approve(await lbB.getAddress(), 
ethers.parseEther("20")); 
    const burnTx = await lbB.connect(user).returnToOrigin(await 
wB.getAddress(), ethers.parseEther("20"), CHAIN_A, await 
lbA.getAddress(), await tA.getAddress(), await user.getAddress()); 
    const burnRc = await burnTx.wait(); 
    const ev2 = burnRc!.logs 
      .map((l) => { try { return mAcn.parseLog({ topics: l.topics, 
data: l.data }) } catch { return null } }) 
      .find((x) => x && x!.name === "MessageSent")!; 
    const eventId2 = ev2!.args[0] as string; 
    const eventHash2 = ev2!.args[7] as string; 
    const nonce2 = ev2!.args[5] as bigint; 
 
    const msgStruct2 = { 
      srcChainId: CHAIN_B, 
      dstChainId: CHAIN_A, 
      srcSender: await lbB.getAddress(), 
      dstReceiver: await lbA.getAddress(), 
      nonce: nonce2, 
      data: ev2!.args[6] as string 
    }; 
 
    // Publicar verdad en LC_A y someter a mA 
    await lcA.connect(updater).updateEventHash(CHAIN_B, eventId2, 
eventHash2); 
    const bondA = await mA.bondAmount(); 
    await mA.connect(relayer).submitMessage(msgStruct2, eventHash2, { 
value: bondA }); 
 
    await ethers.provider.send("evm_increaseTime", [12]); 
    await ethers.provider.send("evm_mine"); 
    await mA.finalize(eventId2, await lcA.getAddress()); 
 
    // Usuario recupera 20 TT en A (tenía 950 tras lock 50) 
    expect(await tA.balanceOf(await 
user.getAddress())).to.equal(ethers.parseEther("970")); 
 
    // --- Prueba de fraude: relayer malicioso somete hash incorrecto 
y es slasheado --- 
    // Reutilizamos el primer eventId pero pretendemos otro hash 
    const fakeHash = 
ethers.keccak256(ethers.toUtf8Bytes("malicioso")); 
    const bondB2 = await mB.bondAmount(); 
    await mB.connect(relayer).submitMessage(msgStruct, fakeHash, { 
value: bondB2 }); 
    // Updater publica la verdad (ya estaba publicada), challenger 
ejecuta challenge y cobra la fianza 
    const balBefore = await ethers.provider.getBalance(await 
challenger.getAddress()); 
await mB.connect(challenger).challenge(eventId, await 
lcB.getAddress(), eventHash); 
const balAfter = await ethers.provider.getBalance(await 
challenger.getAddress()); 
expect(balAfter).to.be.greaterThan(balBefore); 
}); 
}); 
Notas de integración y DoD 
● Repositorios/paths: los archivos Solidity se ubican bajo ./contracts/bridge/ y 
mocks/tests en ./contracts/mocks/ y ./contracts/test/. El relayer PoC está 
en ./scripts/bridge/relayer.ts. 
● Roles: 
1. Arquitecto interop (lead): define parámetros (challengePeriod, 
bondAmount), topología remota con setRemote, y supervisa el diseño del 
LightClientBasic. 
2. Eng. SC: implementa BridgeMessenger, BridgeLockbox, WrappedERC20, 
tests, y scripts del relayer. 
3. Seguridad: revisa superficies (reentrancias, roles, slashing correcto, límites de 
ventana y bond), y escenarios de equivocación del updater. 
● Entregables: 
✅
 BridgeLockbox.sol, 
✅
 BridgeMessenger.sol, 
✅
 
LightClientBasic.sol, 
✅
 WrappedERC20.sol, 
✅
 tests y relayer PoC. 
● DoD (Definition of Done): 
1. Transfer testnet ida/vuelta: el test bridge.poc.test.ts demuestra 
lock→mint en B y burn→unlock en A dentro del mismo entorno Hardhat 
emulando dos chainIds. 
2. Prueba de fraude: challenge() slashea al relayer si su claimedHash no 
coincide con el eventHash publicado en LightClientBasic (ver última 
sección del test). 
3. Métricas básicas de entrega: el evento MessageFinalized en 
BridgeMessenger es el marcador de “entrega”; contadores pueden exportarse 
en el servicio relayer (fuera del alcance del SC). 
● Cómo correr: 
1. pnpm install (o npm i) en el paquete de contratos si es independiente. 
2. npx hardhat test para ejecutar 
contracts/test/bridge.poc.test.ts. 
3. Desplegar en dos testnets EVM (ej. Sepolia ↔ Base Sepolia), otorgar 
RELAYER_ROLE y UPDATER_ROLE, configurar remotos y registrar wrapped. 
Ejecutar el relayer PoC con RPCs en .env: 
RPC_A=... 
RPC_B=... 
MESSENGER_A=0x... 
MESSENGER_B=0x... 
LC_B=0x... 
RELAYER_PK=0x... 
npx ts-node scripts/bridge/relayer.ts 
4.  
Este PoC es didáctico: el LightClientBasic no verifica headers ni receipts 
(solo publica hashes observados). Para producción, sustituir por light-clients reales 
(ej. verificación de receipts Merkle/Patricia y headers con firmas/quorum) y ampliar 
la economía del slashing/bonds. 
Tú dijiste: 
N32 Objetivo: Capa de integración para terceros. Roles: Backend (lead), Seguridad, Tech 
writer. Entregables: OpenAPI/Swagger, Apollo GraphQL, rate-limit. DoD: estabilidad y 
versionado v1. 
ChatGPT Plus 
Pensó durante 1m 11s 
Aquí tienes la implementación completa de la capa de integración para terceros (N32), con 
OpenAPI/Swagger, Apollo GraphQL, rate‑limit, versionado v1, y coherente con la estructura 
del repo de GNEW. Empiezo en cada archivo con su ruta completa y a continuación el código. 
 
