
/**
 * GNEW · N330 — Auditoría financiera continua
 * Rol: Auditor + Data
 * Objetivo: Controles automatizados sobre flujo €↔on-chain.
 * Stack: Reglas, muestreo, reportes.
 * Entregables: Panel de hallazgos; remediación.
 * Pasos: Pruebas sustantivas periódicas.
 * Pruebas/DoD: Hallazgos críticos = 0 sin resolver.
 * Seguridad & Observabilidad: Accesos auditados.
 * Despliegue: Productivo con límites.
 */

import express from "express";
import { runAuditChecks } from "./service/audit";
import { AuditReport } from "./types";

const app = express();
app.use(express.json());

// API: ejecuta auditoría manual
app.post("/api/audit/run", async (_, res) => {
  const report: AuditReport = await runAuditChecks();
  res.json(report);
});

// API: última auditoría
let lastReport: AuditReport | null = null;
app.get("/api/audit/last", (_, res) => {
  if (!lastReport) return res.status(404).json({ error: "No audit yet" });
  res.json(lastReport);
});

export default app;


