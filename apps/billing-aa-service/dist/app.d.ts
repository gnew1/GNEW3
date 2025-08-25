/**
 * GNEW · N322 — Billing recurrente con AA (ERC-4337)
 * Backend: API + scheduler con backoff e idempotencia.
 * - Encola cobros (jobs) por subId y ciclo; reintentos exponenciales; límites; métricas básicas.
 * - Integra opcionalmente con un Bundler ERC-4337 para patrocinar gas (paymaster).
 */
import express from "express";
declare const app: express.Express;
export default app;
