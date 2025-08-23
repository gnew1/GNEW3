
/**
 * GNEW · N327 — Motor fiscal EU/US/LatAm
 * Rol: Fiscalidad + Backend
 * Objetivo: IVA/retenciones, e-invoicing.
 * Stack: Motor de reglas (JSON), plantillas (XML/HTML), firmas (JWS).
 * Entregables: API tax válida por país + validadores.
 * Pasos: Tablas y validadores oficiales (sintaxis); auditoría de cambios.
 * DoD: 100% validación sintáctica (schemas + tests).
 * Seguridad & Observabilidad: JWT opcional (roles tax:*), auditoría en DB, logs pino.
 * Despliegue: Por jurisdicción (habilitable por tabla).
 */

import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { Pool } from "pg";
import { z } from "zod";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ensureMigrations } from "./db/migrate";
import { computeTaxes, ComputeInput } from "./engine/compute";
import { validateTaxId, TaxIdInput, listValidators } from "./engine/validators";
import { buildInvoice, signInvoiceJWS, InvoiceInput, InvoiceSchema } from "./engine/invoice";

const PORT = Number(process.env.PORT ?? 8097);
const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/gnew_tax";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "gnew";
const JWT_ISSUER = process.env.JWT_ISSUER ?? "https://sso.example.com/";
const JWT_PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY ?? "").replace(/\\n/g, "\n");

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
app.use(express.json({ limit: "1mb" }));
app.use(httpLogger);
app.use(authOptional);

// Health + migrate
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.post("/admin/migrate", requireRole("tax:admin"), async (_req, res) => {
  await ensureMigrations(pool);
  res.json({ ok: true });
});

// ---- Admin: rules (audited) ----
const RuleSchema = z.object({
  jurisdiction: z.string().min(2).max(10), // "EU", "ES", "US-CA", "MX", "BR"...
  version: z.string().min(1),
  active: z.boolean().default(true),
  // JSON rule-set: predicates and outcomes
  rules: z.array(z.object({
    id: z.string(),
    when: z.record(z.any()),      // e.g. { b2b: true, destination: "EU", category: "digital" }
    outcome: z.object({
      vatRate: z.number().min(0).max(1).optional(),
      salesTaxRate: z.number().min(0).max(1).optional(),
      withholdingRate: z.number().min(0).max(1).optional(),
      reverseCharge: z.boolean().optional(),
    })
  })),
  note: z.string().optional()
});

app.post("/admin/rules", requireRole("tax:admin"), async (req, res) => {
  const body = RuleSchema.parse(req.body);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const up = await client.query(
      `insert into tax_rules(jurisdiction,version,active,body) values($1,$2,$3,$4)
       on conflict (jurisdiction,version) do update set active=$3, body=$4, updated_at=now()
       returning id`,
      [body.jurisdiction, body.version, body.active, body]
    );
    await client.query(
      `insert into rule_audit(rule_id, actor, change_note, snapshot) values($1,$2,$3,$4)`,
      [up.rows[0].id, (req as any).user?.sub ?? "system", body.note ?? "upsert", body]
    );
    await client.query("commit");
    res.json({ ok: true, ruleId: up.rows[0].id });
  } catch (e: any) {
    await client.query("rollback");
    res.status(400).json({ error: e?.message ?? "rule_error" });
  } finally {
    client.release();
  }
});

app.get("/admin/rules/:jurisdiction", requireRole("tax:admin"), async (req, res) => {
  const j = req.params.jurisdiction;
  const r = await pool.query(`select * from tax_rules where jurisdiction=$1 order by updated_at desc limit 1`, [j]);
  res.json(r.rows[0] ?? null);
});

app.get("/admin/audit/:jurisdiction", requireRole("tax:admin"), async (req, res) => {
  const j = req.params.jurisdiction;
  const r = await pool.query(
    `select a.* from rule_audit a join tax_rules r on r.id=a.rule_id where r.jurisdiction=$1 order by a.created_at desc`,
    [j]
  );
  res.json(r.rows);
});

// ---- Rates & validators ----
app.get("/rates/:jurisdiction", requireRole("tax:read"), async (req, res) => {
  const j = req.params.jurisdiction;
  const r = await pool.query(`select * from tax_rates where jurisdiction=$1 and active=true order by valid_from desc limit 1`, [j]);
  res.json(r.rows[0]?.body ?? null);
});

app.get("/validators", (_req, res) => res.json(listValidators()));

app.post("/validate/taxid", (req, res) => {
  const body = TaxIdInput.parse(req.body);
  const out = validateTaxId(body);
  res.json(out);
});

// ---- Compute taxes ----
app.post("/compute", requireRole("tax:read"), async (req, res) => {
  const input = ComputeInput.parse(req.body);
  const rulesRow = await pool.query(
    `select body from tax_rules where jurisdiction=$1 and active=true order by updated_at desc limit 1`,
    [input.jurisdiction]
  );
  const ratesRow = await pool.query(
    `select body from tax_rates where jurisdiction=$1 and active=true order by valid_from desc limit 1`,
    [input.jurisdiction]
  );
  const rules = rulesRow.rows[0]?.body ?? null;
  const rates = ratesRow.rows[0]?.body ?? null;
  if (!rules || !rates) return res.status(404).json({ error: "jurisdiction_not_configured" });
  res.json(computeTaxes(input, rules, rates));
});

// ---- E-invoicing ----
app.post("/invoice/build", requireRole("tax:write"), (req, res) => {
  const body = InvoiceSchema.parse(req.body as InvoiceInput);
  const xml = buildInvoice(body);
  res.setHeader("content-type", "application/xml; charset=utf-8");
  res.send(xml);
});

app.post("/invoice/sign", requireRole("tax:write"), (req, res) => {
  const body = InvoiceSchema.parse(req.body as InvoiceInput);
  const jws = signInvoiceJWS(body);
  res.json(jws);
});

// Bootstrap
if (require.main === module) {
  ensureMigrations(pool)
    .then(() => app.listen(PORT, () => logger.info({ msg: `tax-engine listening on :${PORT}` })))
    .catch((e) => { logger.error(e, "migration_failed"); process.exit(1); });
}

export default app;


