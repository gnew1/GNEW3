
/**
 * GNEW · N322 — Billing recurrente con AA (ERC-4337)
 * Backend scheduler con cron fiable y retries con backoff, panel de cobros.
 * - Lee suscripciones on-chain y agenda cobros periódicos.
 * - Intenta vía Paymaster (ERC-4337). Fallback a EOA si no hay sponsor.
 * - Idempotencia: consulta lastChargedAt y limita ventana de cobro.
 * - Observabilidad: métricas simples, ratio de fallo y alertas webhook.
 */

import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import path from "path";
import { CronJob } from "cron";
import { chargeDueBatch, metrics, forceCharge } from "./lib/biller";

const PORT = Number(process.env.PORT ?? 8092);
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app: import("express").Express = express();
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));

// Static panel
app.use("/panel", express.static(path.join(__dirname, "..", "public")));

app.get(
  "/healthz",
  (
    _req: import("express").Request,
    res: import("express").Response
  ) => res.json({ ok: true })
);

app.get(
  "/metrics",
  (
    _req: import("express").Request,
    res: import("express").Response
  ) => res.json(metrics())
);

app.post(
  "/charge/:subId",
  async (
    req: import("express").Request,
    res: import("express").Response
  ) => {
  try {
    const subId = BigInt(req.params.subId);
    const out = await forceCharge(subId);
    res.json(out);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg || "force_error" });
  }
}
);

// Cron fiable cada minuto (configurable). Usa backoff interno por sub.
const CRON_EXPR = process.env.CRON_EXPR ?? "*/1 * * * *";
const job = new CronJob(CRON_EXPR, async () => {
  try {
    await chargeDueBatch();
  } catch (e: unknown) {
    logger.error({ err: e }, "cron_error");
  }
});
job.start();

if (require.main === module) {
  app.listen(PORT, () => logger.info({ msg: `subscription-billing-service listening on :${PORT}` }));
}

export default app;


