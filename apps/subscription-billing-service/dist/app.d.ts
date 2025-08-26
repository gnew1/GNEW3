/**
 * GNEW · N322 — Billing recurrente con AA (ERC-4337)
 * Backend scheduler con cron fiable y retries con backoff, panel de cobros.
 * - Lee suscripciones on-chain y agenda cobros periódicos.
 * - Intenta vía Paymaster (ERC-4337). Fallback a EOA si no hay sponsor.
 * - Idempotencia: consulta lastChargedAt y limita ventana de cobro.
 * - Observabilidad: métricas simples, ratio de fallo y alertas webhook.
 */
declare const app: import("express").Express;
export default app;
