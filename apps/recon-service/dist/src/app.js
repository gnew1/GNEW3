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
import jwt from "jsonwebtoken";
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
// Create DB pool: real Postgres by default; fallback to in-memory pg-mem for local dev/tests
let pool;
if (process.env.PG_MEM === "1" || DATABASE_URL === "pgmem" || DATABASE_URL === "mem") {
    // Lazy import to avoid bundling in production
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { newDb } = await import("pg-mem");
    const db = newDb();
    const pgMem = db.adapters.createPg();
    const MemPool = pgMem.Pool;
    pool = new MemPool();
}
else {
    pool = new Pool({ connectionString: DATABASE_URL });
}
function authOptional(req, res, next) {
    const h = req.headers.authorization;
    if (h?.startsWith("Bearer ") && JWT_PUBLIC_KEY) {
        try {
            const tok = h.slice(7);
            const dec = jwt.verify(tok, JWT_PUBLIC_KEY, {
                algorithms: ["RS256"],
                audience: JWT_AUDIENCE,
                issuer: JWT_ISSUER,
            });
            res.locals.user = { sub: String(dec.sub), roles: dec.roles, email: dec.email };
        }
        catch {
            /* ignore */
        }
    }
    next();
}
function requireRole(role) {
    return (_req, res, next) => {
        const u = res.locals.user;
        if (!u?.roles?.includes(role))
            return res.status(403).json({ error: "forbidden" });
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
    format: z.enum(["csv", "json"]).default("csv"),
    // para CSV
    csv: z
        .object({
        delimiter: z.string().default(",").optional(),
        headers: z.object({
            id: z.string(),
            amount: z.string(),
            timestamp: z.string(),
            currency: z.string().optional(),
            memo: z.string().optional(),
            external_ref: z.string().optional(),
        }),
    })
        .optional(),
    // datos: CSV (string) o JSON (array de objetos)
    data: z.union([z.string(), z.array(z.record(z.any()))]),
    tz: z.string().optional(),
});
// ---- Ingesta de movimientos del proveedor
app.post("/provider/upload", requireRole("recon:ingest"), async (req, res) => {
    try {
        const body = UploadSchema.parse(req.body);
        const rows = parseCsvOrJson({
            format: body.format,
            data: body.data,
            csv: body.csv,
            defaultCurrency: body.currency,
            tz: body.tz,
        });
        const client = await pool.connect();
        try {
            await client.query("begin");
            const st = await client.query(`insert into provider_statements(provider, currency, raw) values($1,$2,$3) returning id`, [body.provider, body.currency, body]);
            const statementId = st.rows[0].id;
            for (const r of rows) {
                await client.query(`insert into provider_tx(statement_id, provider, ext_id, amount, currency, ts, memo, external_ref)
           values($1,$2,$3,$4,$5,$6,$7,$8)
           on conflict (provider, ext_id) do nothing`, [
                    statementId,
                    body.provider,
                    r.ext_id,
                    r.amount,
                    r.currency,
                    r.timestamp,
                    r.memo ?? null,
                    r.external_ref ?? null,
                ]);
            }
            await client.query("commit");
            res.json({ ok: true, provider: body.provider, inserted: rows.length, statementId });
        }
        catch (e) {
            await client.query("rollback");
            logger.error({ err: e }, "provider_upload_failed");
            res.status(500).json({ error: "upload_failed", detail: errorMessage(e) });
        }
        finally {
            client.release();
        }
    }
    catch (e) {
        res.status(400).json({ error: "bad_request", detail: errorMessage(e) });
    }
});
// ---- ETL: ledger (CSV o JSON array)
const LedgerUploadSchema = z.object({
    source: z.string().min(1),
    currency: z.string().min(3).max(8).default("EUR"),
    format: z.enum(["csv", "json"]).default("csv"),
    csv: z
        .object({
        delimiter: z.string().default(",").optional(),
        headers: z.object({
            id: z.string(),
            amount: z.string(),
            timestamp: z.string(),
            currency: z.string().optional(),
            memo: z.string().optional(),
            external_ref: z.string().optional(),
        }),
    })
        .optional(),
    data: z.union([z.string(), z.array(z.record(z.any()))]),
    tz: z.string().optional(),
});
app.post("/ledger/upload", requireRole("recon:ingest"), async (req, res) => {
    try {
        const body = LedgerUploadSchema.parse(req.body);
        const rows = parseCsvOrJson({
            format: body.format,
            data: body.data,
            csv: body.csv,
            defaultCurrency: body.currency,
            tz: body.tz,
        });
        const client = await pool.connect();
        try {
            await client.query("begin");
            const imp = await client.query(`insert into ledger_imports(source, currency, raw) values($1,$2,$3) returning id`, [body.source, body.currency, body]);
            const importId = imp.rows[0].id;
            for (const r of rows) {
                await client.query(`insert into ledger_tx(import_id, source, ext_id, amount, currency, ts, memo, external_ref)
           values($1,$2,$3,$4,$5,$6,$7,$8)
           on conflict (source, ext_id) do nothing`, [importId, body.source, r.ext_id, r.amount, r.currency, r.timestamp, r.memo ?? null, r.external_ref ?? null]);
            }
            await client.query("commit");
            res.json({ ok: true, source: body.source, inserted: rows.length, importId });
        }
        catch (e) {
            await client.query("rollback");
            logger.error({ err: e }, "ledger_upload_failed");
            res.status(500).json({ error: "upload_failed", detail: errorMessage(e) });
        }
        finally {
            client.release();
        }
    }
    catch (e) {
        res.status(400).json({ error: "bad_request", detail: errorMessage(e) });
    }
});
// ---- Ejecutar conciliación
const RunSchema = z.object({
    provider: z.string().min(1),
    currency: z.string().min(3).max(8).default("EUR"),
    tolerance: z.number().min(0).max(1).default(DEFAULT_TOLERANCE),
    dateWindowDays: z.number().int().min(0).max(30).default(DEFAULT_DATE_WINDOW_DAYS),
    tag: z.string().optional(),
});
app.post("/reconcile/run", requireRole("recon:run"), async (req, res) => {
    try {
        const p = RunSchema.parse(req.body);
        const out = await runReconciliation(pool, p);
        if (out.diffRatio >= ALERT_DIFF_THRESHOLD) {
            await pool.query(`insert into recon_alerts(run_id, level, message, meta) values($1,$2,$3,$4)`, [out.runId, "warning", "diff_ratio_threshold_exceeded", out]);
        }
        res.json(out);
    }
    catch (e) {
        res.status(400).json({ error: "bad_request", detail: String(e?.message ?? e) });
    }
});
// ---- Consultar run
app.get("/reconcile/runs/:id", requireRole("recon:read"), async (req, res) => {
    const id = String(req.params.id);
    const r = await pool.query(`select id, provider, currency, params, summary, created_at from recon_runs where id=$1`, [id]);
    if (!r.rowCount)
        return res.status(404).json({ error: "not_found" });
    res.json(r.rows[0]);
});
// ---- Health listing simple
app.get("/reconcile/runs", requireRole("recon:read"), async (_req, res) => {
    const r = await pool.query(`select id, provider, currency, created_at, summary from recon_runs order by created_at desc limit 50`);
    res.json(r.rows);
});
// ---- Error handler básico
app.use((err, _req, res) => {
    logger.error({ err }, "unhandled");
    res.status(500).json({ error: "internal_error", detail: errorMessage(err) });
    // no further middleware
});
// ---- Boot
// Ensure DB schema on boot (best-effort)
ensureMigrations(pool).catch((err) => logger.warn({ err }, "migrations_on_boot_failed"));
app.listen(PORT, () => {
    logger.info({ port: PORT, mem: process.env.PG_MEM === "1" || DATABASE_URL === "pgmem" || DATABASE_URL === "mem" }, "recon-service_started");
});
export default app;
function errorMessage(e) {
    return e instanceof Error ? e.message : String(e);
}
