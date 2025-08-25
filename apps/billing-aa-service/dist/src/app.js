/**
 * GNEW · N322 — Billing recurrente con AA (ERC-4337)
 * Backend: API + scheduler con backoff e idempotencia.
 * - Encola cobros (jobs) por subId y ciclo; reintentos exponenciales; límites; métricas básicas.
 * - Integra opcionalmente con un Bundler ERC-4337 para patrocinar gas (paymaster).
 */
import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { Scheduler } from "./scheduler";
import { BundlerClient } from "./bundler";
import { JobsMemStore } from "./store";
import { ethers } from "ethers";
import abi from "./abi/Subscription.json" assert { type: "json" };
const PORT = Number(process.env.PORT ?? 8092);
const ENTRY_POINT = process.env.ERC4337_ENTRYPOINT ?? "0x0000000000000000000000000000000000000000"; // config real en .env
const BUNDLER_RPC = process.env.BUNDLER_RPC ?? "";
const PAYMASTER = process.env.PAYMASTER_ADDRESS ?? "";
const COLLECTOR_SENDER = process.env.COLLECTOR_SMART_ACCOUNT ?? ""; // cuenta AA del collector
const NETWORK_RPC = process.env.NETWORK_RPC ?? "http://127.0.0.1:8545";
const SUBSCRIPTION_ADDRESS = process.env.SUBSCRIPTION_ADDRESS; // requerido
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const httpLogger = pinoHttp({ logger });
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(httpLogger);
// Ethereum provider & contract
const provider = new ethers.JsonRpcProvider(NETWORK_RPC);
const contract = new ethers.Contract(SUBSCRIPTION_ADDRESS, abi, provider);
// Bundler client (opcional)
const bundler = BUNDLER_RPC ? new BundlerClient(BUNDLER_RPC, ENTRY_POINT) : null;
// Jobs store + scheduler
const store = new JobsMemStore();
const scheduler = new Scheduler(store, logger, {
    minBackoffMs: 5_000,
    maxBackoffMs: 10 * 60_000,
    maxRetries: 6,
    concurrency: 4,
    hardDailyChargeLimit: 10_000 // anti-errores
});
// --- API ---
// Añadir una suscripción a la watchlist (alta off-chain para scheduling)
app.post("/watch", async (req, res) => {
    const { subId } = req.body;
    if (!subId)
        return res.status(400).json({ error: "missing_subId" });
    const cyclesDue = await contract.dueCycles(subId);
    await store.watch(Number(subId));
    if (cyclesDue > 0n) {
        await scheduler.enqueue(Number(subId), Number(cyclesDue));
    }
    res.status(202).json({ ok: true, subId, cyclesDue: Number(cyclesDue) });
});
// Forzar escaneo y encolado
app.post("/scan", async (_req, res) => {
    const subs = await store.listWatched();
    let enqueued = 0;
    for (const subId of subs) {
        const cyclesDue = await contract.dueCycles(subId);
        if (cyclesDue > 0n) {
            await scheduler.enqueue(subId, Number(cyclesDue));
            enqueued++;
        }
    }
    res.json({ ok: true, watched: subs.length, enqueued });
});
// Estado del scheduler
app.get("/metrics", async (_req, res) => {
    res.json(scheduler.metrics());
});
// Arranca loop del scheduler (cada 20s verifica y ejecuta)
scheduler.start(async (job) => {
    // Construye llamada a chargeDue(subId) vía:
    // - Modo directo (EOA signer) si se define COLLECTOR_PRIVATE_KEY
    // - Modo AA (UserOperation) si se define BUNDLER_RPC + COLLECTOR_SMART_ACCOUNT (+ PAYMASTER)
    const subId = job.subId;
    try {
        // prefer AA si está configurado
        if (bundler && COLLECTOR_SENDER) {
            await bundler.chargeViaAA({
                sender: COLLECTOR_SENDER,
                target: SUBSCRIPTION_ADDRESS,
                data: new ethers.Interface(abi).encodeFunctionData("chargeDue", [subId]),
                paymaster: PAYMASTER
            });
        }
        else {
            // modo directo para dev: requiere COLLECTOR_PRIVATE_KEY
            const pk = process.env.COLLECTOR_PRIVATE_KEY;
            if (!pk)
                throw new Error("collector_not_configured");
            const signer = new ethers.Wallet(pk, provider);
            const tx = await new ethers.Contract(SUBSCRIPTION_ADDRESS, abi, signer).chargeDue(subId);
            await tx.wait();
        }
        await scheduler.complete(job);
    }
    catch (e) {
        await scheduler.fail(job, e?.message ?? String(e));
    }
});
if (require.main === module) {
    app.listen(PORT, () => logger.info({ msg: `billing-aa-service listening on :${PORT}` }));
}
export default app;
