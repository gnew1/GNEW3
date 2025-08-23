/** 
* Observabilidad de contratos GNEW 
* - Exporta métricas Prometheus en /metrics 
* - Recolecta eventos por contrato (logs) y TXs (status) para 
failure-rate 
* - Webhook opcional /webhooks/failure para integrar 
Tenderly/Blockscout y sumar fallos 
*/ 
import "dotenv/config"; 
import Fastify from "fastify"; 
import { Registry, collectDefaultMetrics, Counter, Gauge } from 
"prom-client"; 
import { ethers, Log } from "ethers"; 
import { z } from "zod"; 
import { ABIS } from "./abis.js"; 
 
const env = z 
  .object({ 
    RPC_URL: z.string().url(), 
    CHAIN_ID: z.coerce.number().int(), 
    CONFIRMATIONS: z.coerce.number().int().default(3), 
    POLL_INTERVAL_MS: z.coerce.number().int().default(6000), 
    START_BLOCK: z.coerce.number().int().default(0), 
    CONTRACTS: z.string().min(1), 
    PORT: z.coerce.number().int().default(9108), 
    HOST: z.string().default("0.0.0.0"), 
    WEBHOOK_SECRET: z.string().optional() 
  }) 
  .parse(process.env); 
 
type Watched = { name: string; address: `0x${string}`; iface: 
ethers.Interface }; 
 
const watched: Watched[] = env.CONTRACTS.split(",").map((pair) => { 
  const [name, addr] = pair.split(":"); 
  const abi = ABIS[name]?.abi; 
  if (!abi) throw new Error(`ABI no encontrada para ${name}`); 
  return { name, address: addr as `0x${string}`, iface: new 
ethers.Interface(abi) }; 
}); 
 
const provider = new ethers.JsonRpcProvider(env.RPC_URL, 
env.CHAIN_ID); 
 
// ---------- Métricas ---------- 
const registry = new Registry(); 
collectDefaultMetrics({ register: registry, labels: { app: 
"gnew-observability" } }); 
const mLastProcessedBlock = new Gauge({ 
name: "gnew_last_processed_block", 
help: "Último bloque procesado por el indexador", 
registers: [registry] 
}); 
const mHeadBlock = new Gauge({ 
name: "gnew_chain_head_block", 
help: "Altura del último bloque conocido por el RPC", 
registers: [registry] 
}); 
const mIndexerLag = new Gauge({ 
name: "gnew_indexer_lag_blocks", 
help: "Retraso del indexador (bloques)", 
registers: [registry] 
}); 
const cEvents = new Counter({ 
name: "gnew_events_total", 
help: "Eventos on-chain por contrato", 
labelNames: ["contract", "event"] as const, 
registers: [registry] 
}); 
const cTxTotal = new Counter({ 
name: "gnew_tx_total", 
help: "Transacciones hacia contratos (éxito + fallo)", 
labelNames: ["contract"] as const, 
registers: [registry] 
}); 
const cTxFailed = new Counter({ 
name: "gnew_tx_failures_total", 
help: "Transacciones fallidas hacia contratos", 
labelNames: ["contract", "source"] as const, // source: "chain" | 
"webhook" 
registers: [registry] 
}); 
const cErrors = new Counter({ 
  name: "gnew_indexer_errors_total", 
  help: "Errores del indexador", 
  labelNames: ["scope"] as const, 
  registers: [registry] 
}); 
 
// ---------- Poller de bloques ---------- 
let lastProcessed = Math.max(env.START_BLOCK, 0); 
 
async function discoverStart(): Promise<void> { 
  if (lastProcessed === 0) { 
    // comenzar en head - confirmations para evitar reorganizaciones 
    const head = await provider.getBlockNumber(); 
    lastProcessed = head - env.CONFIRMATIONS; 
  } 
} 
 
async function loop() { 
  try { 
    const head = await provider.getBlockNumber(); 
    mHeadBlock.set(head); 
    if (lastProcessed >= head - env.CONFIRMATIONS) { 
      mIndexerLag.set(head - lastProcessed); 
      return; 
    } 
 
    const from = lastProcessed + 1; 
    const to = Math.min(head - env.CONFIRMATIONS, from + 1000); // 
lotes de 1000 
    // 1) Procesar logs (eventos) 
    for (const w of watched) { 
      const logs = await provider.getLogs({ 
        fromBlock: from, 
        toBlock: to, 
        address: w.address 
      }); 
      for (const lg of logs as Log[]) { 
        try { 
          const parsed = w.iface.parseLog(lg); 
          cEvents.labels({ contract: w.name, event: parsed.name 
}).inc(); 
        } catch { 
          // ABI no reconoce este log; ignorar 
        } 
      } 
    } 
 
    // 2) Procesar TXs (status) para cada bloque del rango 
    for (let b = from; b <= to; b++) { 
      const blk = await provider.getBlock(b, true); 
      if (!blk?.transactions?.length) continue; 
      const txsToWatched = blk.transactions.filter( 
        (t) => !!t.to && watched.some((w) => w.address.toLowerCase() 
=== (t.to as string).toLowerCase()) 
      ); 
      for (const tx of txsToWatched) { 
        const labelContract = 
          watched.find((w) => w.address.toLowerCase() === (tx.to as 
string).toLowerCase())!.name; 
        cTxTotal.labels({ contract: labelContract }).inc(); 
        const rcpt = await provider.getTransactionReceipt(tx.hash); 
        if (rcpt?.status === 0) { 
          cTxFailed.labels({ contract: labelContract, source: "chain" 
}).inc(); 
        } 
      } 
    } 
 
    lastProcessed = to; 
    mLastProcessedBlock.set(lastProcessed); 
    mIndexerLag.set(head - lastProcessed); 
  } catch (e) { 
    console.error("[poller] error", e); 
    cErrors.labels({ scope: "poller" }).inc(); 
  } 
} 
 
// ---------- HTTP server ---------- 
const app = Fastify({ logger: false }); 
 
app.get("/healthz", async () => { 
  return { ok: true, lastProcessed, watched: watched.map((w) => 
w.name) }; 
}); 
 
app.get("/metrics", async (req, res) => { 
  res.header("Content-Type", registry.contentType); 
  return registry.metrics(); 
}); 
 
// (Opcional) Webhook de fallos (Tenderly/Blockscout). Incrementa 
fallos para el contrato destinatario. 
app.post<{ Body: any }>("/webhooks/failure", async (req, res) => { 
  try { 
    if (env.WEBHOOK_SECRET && req.headers["x-webhook-secret"] !== 
env.WEBHOOK_SECRET) { 
      res.code(401).send({ error: "unauthorized" }); 
      return; 
    } 
    const body = req.body || {}; 
    // Normaliza payloads genéricos: { to, txHash, chainId } 
    const to = (body.to || body.to_address || 
body.transaction?.to)?.toLowerCase(); 
    if (!to) { 
      res.code(400).send({ error: "missing to" }); 
      return; 
    } 
    const w = watched.find((x) => x.address.toLowerCase() === to); 
    if (!w) { 
      res.code(200).send({ ok: true, ignored: true }); 
      return; 
    } 
    cTxTotal.labels({ contract: w.name }).inc(); 
    cTxFailed.labels({ contract: w.name, source: "webhook" }).inc(); 
    res.send({ ok: true }); 
  } catch (e) { 
    cErrors.labels({ scope: "webhook" }).inc(); 
    res.code(500).send({ error: "internal" }); 
  } 
}); 
 
await discoverStart(); 
setInterval(loop, env.POLL_INTERVAL_MS); 
loop().catch(() => {}); 
 
app.listen({ host: env.HOST, port: env.PORT }).then(() => { 
  console.log( 
    `[observability] ready on http://${env.HOST}:${env.PORT} — 
watching ${watched 
      .map((w) => `${w.name}@${w.address}`) 
      .join(", ")}` 
  ); 
}); 
 
