
/**
 * GNEW · N334 — DPIA y plantillas de riesgos
 * Rol: Legal + Seguridad
 * Objetivo: Evaluación de impacto con recomendaciones.
 * Stack: Formularios guiados, scoring.
 * Entregables: DPIA y plan mitigación.
 * Pasos: Categorización y controles.
 * Pruebas/DoD: Aprobación antes de prod.
 * Seguridad & Observabilidad: Versionado.
 * Despliegue: Requerido para features sensibles.
 */

import { v4 as uuidv4 } from "uuid";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/gnew_privacy"
});

export type RiskCategory = "data_minimization" | "legal_basis" | "transfer" | "security_controls";

export interface DPIAForm {
  feature: string;
  owner: string;
  risks: { category: RiskCategory; score: number; notes?: string }[];
}

export interface DPIARecord extends DPIAForm {
  id: string;
  createdAt: Date;
  approved: boolean;
}

export async function submitDPIA(form: DPIAForm): Promise<DPIARecord> {
  const id = uuidv4();
  const rec: DPIARecord = {
    id,
    createdAt: new Date(),
    approved: false,
