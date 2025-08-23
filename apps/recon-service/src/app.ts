
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
import pino from "pino";
import pinoHttp from "pino-http";
import { Pool } from "pg";
import { z } from "zod";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ensureMigrations } from "./db/migrate";
import { parseCsvOrJson } from "./etl/parser";
import { runReconciliation } from "./engine/reconcile";

const PORT = Number(process.env.PORT ?? 8096);
const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/gnew_recon";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "gnew";
const JWT_ISSUER = process.env.JWT_ISSUER ?? "https://sso.example.com/";
const JWT_PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY ?? "").replace(/\\n/g, "\n");
const DEFAULT_TOLERANCE = Number(process.env.RECON_TOLERANCE ?? 0.01); // 1%
const DEFAULT_DATE_WINDOW_DAYS = Number(process.env.RECON_DATE_WINDOW_DAYS ?? 3);
const ALERT_DIFF_THRESHOLD = Number(process.env.ALERT_DIFF_THRESHOLD ?? 0.05); // 5%

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const httpLogger = pinoHttp({ logger });
const pool = new Pool({ connectionString: DATABASE_URL });

type User = { sub: string; roles?: string[]; email?: string };
function authOptional(req: any, _res: any, next: any) {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ") && JWT_PUBLIC_KEY) {
    try {
      const tok = h.slice(7);
      const dec = jwt.verify(tok, JWT_PUBLIC_KEY, {
        algorithms: ["RS256"],
        audience: JWT_AUDIENCE,
        issuer: JWT_ISSUER,
      }) as JwtPayload;
      (req as any).user = { sub: String(dec.sub), roles: dec.roles as string[] | undefined, email: dec.email as string | undefined };
    } catch { /* ignore */ }
  }
  next();
}
function requireRole(role: string) {
  return (req: any, res: any, next: any) => {
    const u: User | undefined = (req as any).user;
    if (!u?.roles?.includes(role)) return res.status(403).json({ error: "forbidden" });
    next();
  };
}

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(httpLogger);
app.use(authOptional);

// ---- Health & migrations
app.get("/healthz", async (_req, res) => res.json({ ok: true }));
app.post("/admin/migrate", requireRole("recon:admin"), async (_req, res) => {
  await ensureMigrations(pool);
  res.json({ ok: true });
});

// ---- ETL: proveedores (CSV o JSON array)
const UploadSchema = z.object({
  provider: z.string().min(1),
  currency: z.string().min(3).max(8).default("EUR"),
  format: z.enum(["csv","json"]).default("csv"),
  // para CSV
  csv: z.object({
    delimiter: z.string().default(","),
    headers: z.object({
      id: z.string(),
      amount: z.string(),
      timestamp: z

Tú dijiste:
Como IA programadora de GNEW, ejecuta el siguiente prompt N del archivo "/mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt" empezando en N321 (N320 se ejecutó en la interacción actual) y avanza +1 en cada ejecución hasta N340, sin repetirte. Para cada prompt: 1) entrega exactamente lo pedido con código listo para producción; 2) empieza la respuesta con la RUTA COMPLETA del archivo de salida y debajo el código en el lenguaje indicado; 3) mantén coherencia con el monorepo (Node/TypeScript predominante, backend principal app.ts) y convenciones establecidas; 4) incluye pruebas y scripts de integración cuando proceda; 5) evita texto superfluo fuera de rutas+código salvo breves notas de uso; 6) conserva y actualiza un puntero interno de progreso para continuar en N+1 y detenerse al llegar a N340.
ChatGPT Plus
Pensó durante 54s

