
/**
 * GNEW · N337 — Data Retention Engine
 * Rol: Legal + Backend
 * Objetivo: Expiración de datos por política/jurisdicción.
 * Stack: Jobs programados, auditoría.
 * Entregables: Motor de expiración.
 * Pasos: Definir reglas por tabla/columna.
 * Pruebas/DoD: Expira conforme a reglas.
 * Seguridad & Observabilidad: Logs y métricas.
 * Despliegue: Obligatorio en todo dataset sensible.
 */

import { Pool } from "pg";
import cron from "node-cron";
import pino from "pino";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/gnew_privacy"
});

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export interface RetentionRule {
  id: string;
  table: string;
  column: string;
  days: number;
  jurisdiction: string;
  active: boolean;
}

async function getActiveRules(): Promise<RetentionRule[]> {
  const res = await pool.query<RetentionRule>(
    "SELECT * FROM retention_rules WHERE active=true"
  );
  return res.rows;
}

async function applyRule(rule: RetentionRule) {
  const query = `
    DELETE FROM ${rule.table}
    WHERE ${rule.column} < NOW() - INTERVAL '${rule.days} days'
  `;
  try {
    const result = await pool.query(query);
    logger.info(
      { ruleId: rule.id, rowCount: result.rowCount },
      "Retention rule applied"
    );
    await pool.query(
      `INSERT INTO retention_audit(rule_id, deleted_count, executed_at)
       VALUES ($1,$2,$3)`,
      [rule.id, result.rowCount, new Date()]
    );
  } catch (err) {
    logger.error({ ruleId: rule.id, error: (err as Error).message });
  }
}

export async function runRetentionJob() {
  const rules = await getActiveRules();
  for (const rule of rules) {
    await applyRule(rule);
  }
}

// Schedule every day at 02:00
cron.schedule("0 2 * * *", async () => {
  logger.info("Starting daily retention job");
  await runRetentionJob();
});

if (require.main === module) {
  runRetentionJob().then(() => {
    logger.info("Retention job executed manually");
    process.exit(0);
  });
}


