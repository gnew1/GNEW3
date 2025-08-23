
/**
 * GNEW · N332 — Mapa de datos y RoPA
 * Rol: LegalOps
 * Objetivo: Registro de actividades de tratamiento.
 * Stack: Catálogo + formularios; aprobaciones.
 * Entregables: RoPA exportable.
 * Pasos: Inventario y owners.
 * Pruebas/DoD: Cobertura ≥ 95% procesos.
 * Seguridad & Observabilidad: Acceso restringido.
 * Despliegue: Global.
 */

import express from "express";
import { Pool } from "pg";
import { z } from "zod";
import { Parser } from "json2csv";

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/gnew_legal"
});

// Schema para validar entradas
const ropaSchema = z.object({
  processName: z.string().min(1),
  owner: z.string().email(),
  purpose: z.string(),
  dataCategories: z.array(z.string()),
  recipients: z.array(z.string()),
  retentionPeriod: z.string()
});

// Crear registro
router.post("/ropa", async (req, res) => {
  const parsed = ropaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { processName, owner, purpose, dataCategories, recipients, retentionPeriod } = parsed.data;

  await pool.query(
    `INSERT INTO ropa(process_name, owner, purpose, data_categories, recipients, retention_period) 
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [processName, owner, purpose, dataCategories, recipients, retentionPeriod]
  );
  res.status(201).json({ status: "ok" });
});

// Listar registros
router.get("/ropa", async (_req, res) => {
  const result = await pool.query("SELECT * FROM ropa ORDER BY created_at DESC");
  res.json(result.rows);
});

// Exportar a CSV (cumple auditoría)
router.get("/ropa/export", async (_req, res) => {
  const result = await pool.query("SELECT * FROM ropa");
  const parser = new Parser();
  const csv = parser.parse(result.rows);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=ropa.csv");
  res.send(csv);
});

export default router;


