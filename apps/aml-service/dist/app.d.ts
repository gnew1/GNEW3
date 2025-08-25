/**
 * GNEW · N324 — Monitor AML/ATF en tiempo real
 * Rol: Compliance + Data
 * Objetivo: Reglas y ML para detectar patrones sospechosos.
 * Stack: Scoring (modelo lineal), listas sancionadas, explainers (atribuciones por feature), evidencia inmutable (hash-chain).
 * Entregables: Alerta con evidencia y flujo L2 (ack/esc/close).
 * Pruebas/DoD: Métricas FPR/FNR, auditoría, umbrales por riesgo.
 * Seguridad & Observabilidad: JWT opcional (roles aml:*), logs pino, métricas.
 * Despliegue: Gradual (mode: "shadow"|"enforced").
 */
import express from "express";
declare const app: express.Express;
export default app;
