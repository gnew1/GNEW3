
/**
 * GNEW · N336 — Gestor de consentimiento granular
 * Rol: UX + Backend
 * Objetivo: Registro granular de propósitos y finalidades.
 * Stack: API REST, versionado.
 * Entregables: UI + logs de consentimiento.
 * Pasos: API CRUD; versionamiento.
 * Pruebas/DoD: Captura/retirada trazable.
 * Seguridad & Observabilidad: Logs firmados.
 * Despliegue: Obligatorio para todo dato sensible.
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

type ConsentAction = "GRANTED" | "REVOKED";

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  action: ConsentAction;
  version: number;
  createdAt: Date;
  signature: string;
}

async function logConsent(
  userId: string,
  purpose: string,
  action: ConsentAction
): Promise<ConsentRecord> {
  const versionRes = await pool.query(
    "SELECT max(version) as v FROM consent WHERE user_id=$1 AND purpose=$2",
    [userId, purpose]
  );
  const version = (versionRes.rows[0]?.v ?? 0) + 1;

  const id = crypto.randomUUID();
  const createdAt = new Date();
  const raw = `${id}|${userId}|${purpose}|${action}|${version}|${createdAt.toISOString()}`;
  const signature = crypto
    .createHmac("sha256", process.env.SIGN_KEY ?? "consent-secret")
    .update(raw)
    .digest("hex");

  await pool.query(
    `INSERT INTO consent(id, user_id, purpose, action, version, created_at, signature)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [id, userId, purpose, action, version, createdAt, signature]
  );

  return { id, userId, purpose, action, version, createdAt, signature };
}

app.post("/consent", async (req: Request, res: Response) => {
  const { userId, purpose, action } = req.body;
  if (!userId || !purpose || !action) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    const record = await logConsent(userId, purpose, action);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/consent/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const result = await pool.query(
    "SELECT * FROM consent WHERE user_id=$1 ORDER BY created_at DESC",
    [userId]
  );
  res.json(result.rows);
});

export function startConsentManager(port = 4002) {
  return app.listen(port, () => {
    console.log(`Consent Manager running on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startConsentManager();
}


