
/**
 * GNEW · N338 — Immutable Audit Trail
 * Rol: Legal + Backend
 * Objetivo: Registro inmutable de accesos y cambios.
 * Stack: PostgreSQL + Hash encadenado.
 * Entregables: API de inserción/consulta.
 * Pasos: Hash de bloque anterior + registro actual.
 * Pruebas/DoD: Verificación de cadena sin roturas.
 * Seguridad & Observabilidad: Inmutable salvo truncado.
 */

import { Pool } from "pg";
import express, { Request, Response } from "express";
import crypto from "crypto";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/gnew_privacy"
});

const app = express();
app.use(express.json());

export interface AuditRecord {
  id: number;
  actor: string;
  action: string;
  target: string;
  createdAt: Date;
  hash: string;
  prevHash: string | null;
}

async function getLastHash(): Promise<string | null> {
  const res = await pool.query("SELECT hash FROM audit ORDER BY id DESC LIMIT 1");
  return res.rows[0]?.hash ?? null;
}

async function addAudit(actor: string, action: string, target: string): Promise<AuditRecord> {
  const prevHash = await getLastHash();
  const createdAt = new Date();
  const raw = `${actor}|${action}|${target}|${createdAt.toISOString()}|${prevHash ?? ""}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  const result = await pool.query(
    `INSERT INTO audit(actor, action, target, created_at, hash, prev_hash)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [actor, action, target, createdAt, hash, prevHash]
  );
  return result.rows[0];
}

async function verifyChain(): Promise<boolean> {
  const res = await pool.query("SELECT * FROM audit ORDER BY id ASC");
  let prevHash: string | null = null;
  for (const row of res.rows) {
    const raw = `${row.actor}|${row.action}|${row.target}|${row.created_at.toISOString()}|${prevHash ?? ""}`;
    const expected = crypto.createHash("sha256").update(raw).digest("hex");
    if (expected !== row.hash) return false;
    prevHash = row.hash;
  }
  return true;
}

app.post("/audit", async (req: Request, res: Response) => {
  const { actor, action, target } = req.body;
  if (!actor || !action || !target) return res.status(400).json({ error: "Missing fields" });
  const record = await addAudit(actor, action, target);
  res.json(record);
});

app.get("/audit/verify", async (_req: Request, res: Response) => {
  const valid = await verifyChain();
  res.json({ valid });
});

export function startAuditTrail(port = 4003) {
  return app.listen(port, () => {
    console.log(`Audit Trail service running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startAuditTrail();
}


