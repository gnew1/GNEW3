/**
 * GNEW · N326 — Conciliación multi-proveedor
 * Rol: Integraciones
 * Objetivo: Reconciliar on/off-ramp, bancos y ledgers.
 * Stack: ETL (CSV/JSON), reglas de matching, reportes. Node/TS + Postgres.
 * Entregables: Diarios de conciliación, alertas.
 * Pasos: Diferencias; reintentos; manual review.
 * Pruebas/DoD: Diferencias < X%.
 * Seguridad & Observabilidad: JWT (roles recon:*), logs pino.
 * Despliegue: Iterativo.
 */
import express from "express";
declare const app: express.Express;
export default app;
