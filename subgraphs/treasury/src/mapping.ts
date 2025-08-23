import { ExecutionSuccess, ExecutionFailure } from 
"../generated/GnosisSafe/GnosisSafe"; 
import { Movement, Safe } from "../generated/schema"; 
import { Address, BigInt, crypto, ByteArray } from 
"@graphprotocol/graph-ts"; 
// Utilidad para obtener/crear Safe 
function getOrCreateSafe(addr: Address): Safe { 
let id = addr.toHexString().toLowerCase(); 
let s = Safe.load(id); 
if (s == null) { 
    s = new Safe(id); 
    s.txCount = BigInt.zero(); 
    s.save(); 
  } 
  return s as Safe; 
} 
 
function deterministicId(txHash: ByteArray): string { 
  return txHash.toHexString(); 
} 
 
export function handleExecutionSuccess(ev: ExecutionSuccess): void { 
  const safe = getOrCreateSafe(ev.address); 
  safe.txCount = safe.txCount.plus(BigInt.fromI32(1)); 
  safe.save(); 
 
  const id = deterministicId(ev.transaction.hash); 
  let m = new Movement(id); 
  m.safe = safe.id; 
  // NOTA: el "to" no viene en el evento; derivarlo de input es 
costoso en AS. 
  // Se graba address cero y se debe enriquecer en el ETL. 
  m.to = Address.zero(); 
  m.value = ev.params.payment; // para native; puede ser 0 si no hay 
reembolso 
  m.token = null; 
  m.tokenAmount = null; 
  m.type = "OUTFLOW"; 
  m.txHash = ev.transaction.hash; 
  m.blockNumber = ev.block.number; 
  m.timestamp = ev.block.timestamp; 
  m.nonce = null; 
  m.memo = null; 
  m.save(); 
} 
 
export function handleExecutionFailure(ev: ExecutionFailure): void { 
  const safe = getOrCreateSafe(ev.address); 
  const id = deterministicId(ev.transaction.hash); 
  let m = new Movement(id); 
  m.safe = safe.id; 
  m.to = Address.zero(); 
  m.value = ev.params.payment; 
  m.type = "FAILED"; 
  m.txHash = ev.transaction.hash; 
  m.blockNumber = ev.block.number; 
  m.timestamp = ev.block.timestamp; 
  m.memo = null; 
  m.save(); 
} 
 
 
