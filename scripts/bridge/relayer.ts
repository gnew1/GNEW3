import { ethers } from "hardhat"; 
import type { Contract, EventLog } from "ethers"; 
 
/** 
 * PoC relayer "ingenuo": escucha MessageSent en chain A y lleva el 
mensaje a chain B. 
 * Requiere: 
 *  - Dos providers configurados (RPC_A, RPC_B) 
 *  - Cuentas con permiso RELAYER_ROLE en ambos BridgeMessenger 
 *  - UPDATER_ROLE en LightClient destino 
 *  - bondAmount de messengerB en el wallet del relayer 
 */ 
async function main() { 
  const rpcA = process.env.RPC_A!; 
  const rpcB = process.env.RPC_B!; 
  const messengerA = process.env.MESSENGER_A!; 
  const messengerB = process.env.MESSENGER_B!; 
  const lightClientB = process.env.LC_B!; 
  const pk = process.env.RELAYER_PK!; 
 
  const pa = new ethers.JsonRpcProvider(rpcA); 
  const pb = new ethers.JsonRpcProvider(rpcB); 
  const wa = new ethers.Wallet(pk, pa); 
  const wb = new ethers.Wallet(pk, pb); 
 
  const abiMessenger = (await 
ethers.getArtifact("BridgeMessenger")).abi; 
  const abiLC = (await ethers.getArtifact("LightClientBasic")).abi; 
 
  const mA = new ethers.Contract(messengerA, abiMessenger, wa); 
  const mB = new ethers.Contract(messengerB, abiMessenger, wb); 
  const lcB = new ethers.Contract(lightClientB, abiLC, wb); 
 
  const bond = await mB.bondAmount(); 
 
  mA.on("MessageSent", async (...args) => { 
    const ev = args.at(-1) as EventLog; 
    const [eventId, srcChainId, dstChainId, srcSender, dstReceiver, 
nonce, data, eventHash] = ev.args as any[]; 
    if ((await wb.provider!.getNetwork()).chainId !== 
BigInt(dstChainId)) return; 
 
    // Armamos la struct Message como la espera submitMessage 
    const msgStruct = { 
      srcChainId, 
      dstChainId, 
      srcSender, 
      dstReceiver, 
      nonce, 
      data, 
    }; 
 
    // 1) Actualizamos LightClient destino con la "verdad" observada 
    const tx1 = await lcB.updateEventHash(srcChainId, eventId, 
eventHash); 
    await tx1.wait(); 
 
    // 2) Enviamos la submission optimista a Messenger destino con 
fianza 
    const tx2 = await mB.submitMessage(msgStruct, eventHash, { value: 
bond }); 
    const r2 = await tx2.wait(); 
    console.log(`submitted ${eventId}, tx=${r2?.hash}`); 
 
    // 3) (opcional) programar finalize tras challengePeriod 
  }); 
 
  console.log("Relayer escuchando MessageSent en chain A..."); 
} 
 
main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
}); 
 
 
