
/**
 * GNEW · N340 — RegTech Integration Engine
 * Rol: Legal + Backend + API
 * Objetivo: Integrar con APIs externas de RegTech para validar cumplimiento normativo en tiempo real.
 * Stack: Node/TypeScript + Axios + PostgreSQL.
 * Entregables: Servicio que consulta APIs externas, guarda resultados y expone un endpoint REST.
 * Pruebas/DoD: Validar consulta y persistencia en DB.
 * Seguridad & Observabilidad: Logs y auditoría completa.
 */

import express, { Request, Response } from "express";
import axios from "axios";
import { Pool } from "pg";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/gnew_privacy"
});

const app = express();
app.use(express.json());

interface CheckResult {
  companyId: string;
  status: string;
  details: any;
}

async function saveResult(result: CheckResult) {
  await pool.query(
    "INSERT INTO regtech_results(company_id, status, details, checked_at) VALUES ($1,$2,$3,$4)",
    [result.companyId, result.status, JSON.stringify(result.details), new Date()]
  );
}

async function queryRegTechAPI(companyId: string): Promise<CheckResult> {
  try {
    const resp = await axios.get(
      `${process.env.REGTECH_API_URL}/compliance/${companyId}`,
      {
        headers: { Authorization: `Bearer ${process.env.REGTECH_API_KEY}` }
      }
    );

    return {
      companyId,
      status: resp.data.status,
      details: resp.data
    };
  } catch (err) {
    logger.error({ companyId, error: (err as Error).message }, "RegTech API error");
    return { companyId, status: "error", details: { error: (err as Error).message } };
  }
}

app.post("/regtech/check", async (req: Request, res: Response) => {
  const { companyId } = req.body;
  if (!companyId) return res.status(400).json({ error: "Missing companyId" });

  const result = await queryRegTechAPI(companyId);
  await saveResult(result);
  res.json(result);
});

export function startRegTechIntegration(port = 4005) {
  return app.listen(port, () => {
    logger.info(`RegTech Integration running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startRegTechIntegration();
}


