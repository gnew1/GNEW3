
/**
 * GNEW · N323 — Ledger doble-entrada auditable
 * Rol: FinTech Eng
 * Objetivo: Subledger on-chain/off-chain con export XBRL.
 * Stack: Postgres + eventos; snapshot on-chain (txid/chain); Node/TS + Express.
 * Entregables: Tablas, vistas, exportadores (XBRL); conciliación automática; bloqueo de período.
 * Pruebas/DoD: Descuadre = 0; trazabilidad por txid; period lock.
 * Seguridad & Observabilidad: Rastreabilidad por txid; logs estructurados; SSO opcional (JWT).
 * Despliegue: Migración guiada (SQL en /src/db/migrations).
 */

import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { Pool } from "pg";
import { z } from "zod";
import jwt, { JwtPayload } from "jsonwebtoken";
import { exportXBRLInstance } from "./xbrl/exporter";
import { runMigrations } from "./db/migrate";

// ---------- Config ----------
const PORT = Number(process.env.PORT ?? 8093);
const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/gnew_ledger";
const APPLY_TRIGGERS = (process.env.APPLY_TRIGGERS ?? "true").toLowerCase() === "true";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "gnew";
const JWT_ISSUER = process.env.JWT_ISSUER ?? "https://sso.example.com/";
const JWT_PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY ?? "").replace(/\\n/g, "\n");

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const httpLogger = pinoHttp({ logger });

const pool = new Pool({ connectionString: DATABASE_URL });

// ---------- Auth (optional) ----------
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
    } catch {
      /* ignore */
    }
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

// ---------- App ----------
const app: import("express").Express = express();
app.use(express.json({ limit: "1mb" }));
app.use(httpLogger);
app.use(authOptional);

// Health & migrations
app.get("/healthz", async (_req, res) => res.json({ ok: true }));
app.post("/admin/migrate", requireRole("ledger:admin"), async (_req, res) => {
  await runMigrations(pool, APPLY_TRIGGERS);
  res.json({ ok: true });
});

// ---------- Schemas ----------
const accountSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(128),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  currency: z.string().min(3).max(8).default("EUR"),
  metadata: z.record(z.any()).optional(),
});

const lineSchema = z.object({
  accountCode: z.string().min(1),
  debit: z.number().nonnegative().default(0),
  credit: z.number().nonnegative().default(0),
  description: z.string().optional(),
  txid: z.string().optional(), // on-chain tx traceability
  chain: z.string().optional(), // e.g., "eth:mainnet"
  external_ref: z.string().optional(),
  meta: z.record(z.any()).optional(),
});

const entrySchema = z.object({
  occurredAt: z.string().datetime(),
  reference: z.string().optional(),
  external_ref: z.string().optional(),
  lines: z.array(lineSchema).min(2),
});

// ---------- Helpers ----------
async function getAccountIdByCode(client: any, code: string) {
  const r = await client.query("select id from gl_accounts where code=$1", [code]);
  if (!r.rowCount) throw new Error(`account_not_found:${code}`);
  return r.rows[0].id as number;
}

async function ensureBalanced(lines: z.infer<typeof lineSchema>[]) {
  const sumDebit = lines.reduce((a, l) => a + (l.debit ?? 0), 0);
  const sumCredit = lines.reduce((a, l) => a + (l.credit ?? 0), 0);
  if (Math.round((sumDebit - sumCredit) * 100) !== 0) {
    throw new Error("unbalanced_entry");
  }
  if (sumDebit === 0 && sumCredit === 0) throw new Error("empty_entry");
}

// ---------- Endpoints ----------

// Create account
app.post("/accounts", requireRole("ledger:write"), async (req, res) => {
  try {
    const body = accountSchema.parse(req.body);
    const r = await pool.query(
      `insert into gl_accounts(code,name,type,currency,metadata) values($1,$2,$3,$4,$5) returning *`,
      [body.code, body.name, body.type, body.currency, body.metadata ?? {}],
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    if (e.code === "23505") return res.status(409).json({ error: "account_code_exists" });
    res.status(400).json({ error: e?.message ?? "bad_request" });
  }
});

// Draft entry (unposted)
app.post("/journal/entries", requireRole("ledger:write"), async (req, res) => {
  const client = await pool.connect();
  try {
    const body = entrySchema.parse(req.body);
    await ensureBalanced(body.lines);

    await client.query("begin");
    const occurred = new Date(body.occurredAt);
    const period = `${occurred.getUTCFullYear()}-${String(occurred.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const r = await client.query(
      `insert into gl_entries(occurred_at, period_month, status, reference, external_ref)
       values($1,$2,'draft',$3,$4) returning *`,
      [body.occurredAt, period, body.reference ?? null, body.external_ref ?? null],
    );
    const entryId = r.rows[0].id as string;

    for (const ln of body.lines) {
      const accId = await getAccountIdByCode(client, ln.accountCode);
      await client.query(
        `insert into gl_entry_lines(entry_id, account_id, debit, credit, description, txid, chain, external_ref, metadata)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          entryId,
          accId,
          ln.debit ?? 0,
          ln.credit ?? 0,
          ln.description ?? null,
          ln.txid ?? null,
          ln.chain ?? null,
          ln.external_ref ?? null,
          ln.meta ?? {},
        ],
      );
    }
    await client.query("commit");
    res.status(201).json({ id: entryId, status: "draft" });
  } catch (e: any) {
    await client.query("rollback");
    res.status(400).json({ error: e?.message ?? "bad_request" });
  } finally {
    client.release();
  }
});

// Post entry (immutability + DB-level checks if triggers enabled)
app.post("/journal/entries/:id/post", requireRole("ledger:write"), async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("begin");
    // app-level guard (DoD for tests); DB trigger enforces when APPLY_TRIGGERS=true
    const sums = await client.query(
      `select
         sum(debit)::numeric(20,8) as deb,
         sum(credit)::numeric(20,8) as cred,
         min(e.period_month) as period
       from gl_entry_lines l join gl_entries e on e.id=l.entry_id
       where l.entry_id=$1
       group by l.entry_id`,
      [id],
    );
    if (!sums.rowCount) throw new Error("entry_not_found");
    const { deb, cred, period } = sums.rows[0];
    if (Number(deb) !== Number(cred)) throw new Error("unbalanced_entry");
    // check period lock
    const locked = await client.query("select locked from gl_periods where period_month=$1", [period]);
    if (locked.rowCount && locked.rows[0].locked === true) throw new Error("period_locked");

    const r = await client.query(
      `update gl_entries set status='posted', posted_at=now()
         where id=$1 and status='draft'
         returning id,status,posted_at`,
      [id],
    );
    if (!r.rowCount) throw new Error("cannot_post");
    await client.query("commit");
    res.json(r.rows[0]);
  } catch (e: any) {
    await client.query("rollback");
    res.status(400).json({ error: e?.message ?? "post_failed" });
  } finally {
    client.release();
  }
});

// Lock a period (YYYY-MM)
app.post("/periods/:ym/lock", requireRole("ledger:admin"), async (req, res) => {
  const ym = req.params.ym;
  if (!/^\d{4}-\d{2}$/.test(ym)) return res.status(400).json({ error: "bad_period" });
  const p = `${ym}-01`;
  await pool.query(
    `insert into gl_periods(period_month,locked,locked_by)
     values($1,true,$2)
     on conflict (period_month) do update set locked=true, locked_by=$2, locked_at=now()`,
    [p, (req as any).user?.sub ?? "system"],
  );
  res.json({ ok: true, period: ym });
});

// Trial balance (as of date)
app.get("/balances/trial", requireRole("ledger:read"), async (req, res) => {
  const asOf = req.query.asOf ? String(req.query.asOf) : new Date().toISOString();
  const r = await pool.query(
    `select * from v_trial_balance_asof($1::timestamptz)`,
    [asOf],
  );
  res.json(r.rows);
});

// Entry detail (with txid trace)
app.get("/journal/entries/:id", requireRole("ledger:read"), async (req, res) => {
  const { id } = req.params;
  const r = await pool.query(
    `select e.*, json_agg(json_build_object(
       'id', l.id, 'account_id', l.account_id, 'debit', l.debit, 'credit', l.credit,
       'description', l.description, 'txid', l.txid, 'chain', l.chain, 'external_ref', l.external_ref
     ) order by l.id) as lines
     from gl_entries e join gl_entry_lines l on l.entry_id=e.id
     where e.id=$1
     group by e.id`,
    [id],
  );
  if (!r.rowCount) return res.status(404).json({ error: "not_found" });
  res.json(r.rows[0]);
});

// Reconciliation (auto-match by txid or amount+external_ref)
app.post("/reconcile/auto", requireRole("ledger:write"), async (req, res) => {
  const body = z
    .object({
      txid: z.string().optional(),
      chain: z.string().optional(),
      amount: z.number().optional(),
      external_ref: z.string().optional(),
      occurredAt: z.string().datetime().optional(),
    })
    .parse(req.body);

  const client = await pool.connect();
  try {
    await client.query("begin");
    // Insert external event
    const ev = await client.query(
      `insert into ext_events(txid, chain, amount, external_ref, occurred_at)
       values($1,$2,$3,$4,$5) returning id`,
      [body.txid ?? null, body.chain ?? null, body.amount ?? null, body.external_ref ?? null, body.occurredAt ?? new Date().toISOString()],
    );
    const evId = ev.rows[0].id as string;

    // Try to find matching line
    let match: any;
    if (body.txid) {
      match = await client.query(
        `select id, entry_id from gl_entry_lines where txid=$1 order by id limit 1`,
        [body.txid],
      );
    }
    if ((!match || !match.rowCount) && body.amount && body.external_ref) {
      match = await client.query(
        `select id, entry_id from gl_entry_lines
         where (debit=$1 or credit=$1) and external_ref=$2
         order by id limit 1`,
        [body.amount, body.external_ref],
      );
    }

    if (match && match.rowCount) {
      const lineId = match.rows[0].id as string;
      await client.query(
        `insert into gl_reconciliations(line_id, event_id, status, matched_at) values($1,$2,'matched',now())`,
        [lineId, evId],
      );
      await client.query("commit");
      return res.json({ ok: true, matched: true, lineId, eventId: evId });
    } else {
      await client.query(
        `insert into gl_reconciliations(event_id, status) values($1,'unmatched')`,
        [evId],
      );
      await client.query("commit");
      return res.json({ ok: true, matched: false, eventId: evId });
    }
  } catch (e: any) {
    await client.query("rollback");
    res.status(500).json({ error: e?.message ?? "reconcile_failed" });
  } finally {
    client.release();
  }
});

// XBRL export (simple instance for trial balance of a period YYYY-MM)
app.get("/export/xbrl", requireRole("ledger:read"), async (req, res) => {
  const ym = String(req.query.period ?? "");
  if (!/^\d{4}-\d{2}$/.test(ym)) return res.status(400).json({ error: "bad_period" });
  const period = `${ym}-01`;
  const balances = await pool.query(
    `select a.code, a.name, a.type,
            sum(case when e.status='posted' then l.debit - l.credit else 0 end)::numeric(20,8) as balance
     from gl_entry_lines l
     join gl_entries e on e.id=l.entry_id
     join gl_accounts a on a.id=l.account_id
     where e.period_month=$1
     group by a.code,a.name,a.type
     order by a.code`,
    [period],
  );
  const xml = exportXBRLInstance({
    periodYM: ym,
    entityId: "GNEW",
    currency: "EUR",
    items: balances.rows.map((r: any) => ({
      code: r.code,
      name: r.name,
      type: r.type,
      balance: String(r.balance ?? "0"),
    })),
  });
  res.setHeader("content-type", "application/xml; charset=utf-8");
  res.send(xml);
});

// ---------- Bootstrap ----------
if (require.main === module) {
  runMigrations(pool, APPLY_TRIGGERS)
    .then(() => app.listen(PORT, () => logger.info({ msg: `ledger-service listening on :${PORT}` })))
    .catch((e) => {
      logger.error(e, "migration_failed");
      process.exit(1);
    });
}

export default app;


