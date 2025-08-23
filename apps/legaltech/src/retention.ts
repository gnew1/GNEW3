
/**
 * GNEW · N333 — Retención/minimización automatizada
 * Rol: Data + Privacy
 * Objetivo: Políticas por tipo de dato y purga.
 * Stack: Jobs con etiquetas; verificaciones.
 * Entregables: Políticas versionadas; reportes.
 * Pasos: TTL por categoría; excepciones.
 * Pruebas/DoD: Expiración efectiva; DSAR “delete”.
 * Seguridad & Observabilidad: Evidencias de cumplimiento.
 * Despliegue: Fases.
 */

import { Pool } from "pg";
import cron from "node-cron";
import { DateTime } from "luxon";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/gnew_privacy"
});

// Definición de políticas de retención por categoría
type RetentionPolicy = {
  category: string;
  ttlDays: number;
  exception?: boolean;
};

const policies: RetentionPolicy[] = [
  { category: "logs", ttlDays: 30 },
  { category: "user_activity", ttlDays: 365 },
  { category: "financial_records", ttlDays: 365 * 7, exception: true } // excepción: conservar por ley
];

// Ejecuta limpieza periódica
async function purgeExpiredData() {
  for (const policy of policies) {
    if (policy.exception) continue;
    const cutoff = DateTime.now().minus({ days: policy.ttlDays }).toISO();
    const query = `
      DELETE FROM data_records
      WHERE category = $1 AND created_at < $2
      RETURNING id
    `;
    const result = await pool.query(query, [policy.category, cutoff]);
    if (result.rowCount && result.rowCount > 0) {
      await pool.query(
        `INSERT INTO retention_audit(category, deleted_count, run_at) VALUES ($1,$2,now())`,
        [policy.category, result.rowCount]
      );
    }
  }
}

// Tarea programada diaria
cron.schedule("0 3 * * *", purgeExpiredData);

export async function manualDSARDelete(userId: string) {
  const res = await pool.query(
    `DELETE FROM data_records WHERE user_id=$1 RETURNING id`,
    [userId]
  );
  await pool.query(
    `INSERT INTO retention_audit(category, deleted_count, run_at, dsar) VALUES ($1,$2,now(),true)`,
    ["DSAR", res.rowCount]
  );
  return res.rowCount;
}


