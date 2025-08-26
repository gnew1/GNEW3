
/**
 * GNEW · N324 — Monitor AML/ATF en tiempo real
 * Rol: Compliance + Data
 * Objetivo: Reglas y ML para detectar patrones sospechosos.
 * Stack: Scoring (modelo lineal), listas sancionadas, explainers (atribuciones por feature), evidencia inmutable (hash-chain).
 * Entregables: Alerta con evidencia y flujo L2 (ack/esc/close).
 * Pruebas/DoD: Métricas FPR/FNR, auditoría, umbrales por riesgo.
 * Seguridad & Observabilidad: JWT opcional (roles aml:*), logs pino, métricas.
 * Despliegue: Gradual (mode: "shadow"|"enforced").
 */

import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { Pool, PoolClient } from "pg";
import { z } from "zod";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ensureMigrations } from "./db/migrate";
import { scoreTx, explainTx, type ModelCfg } from "./engine/model";
import { checkRules } from "./engine/rules";
import { anchorEvidence } from "./evidence/hashchain";
import { v4 as uuidv4 } from "uuid";

try {
  (0, eval)("require")("dotenv").config();
} catch {
  /* dotenv not installed */
}

const PORT = Number(process.env.PORT ?? 8094);
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DATABASE_URL =
  process.env.DATABASE_URL ?? `postgres://postgres:${DB_PASSWORD}@localhost:5432/gnew_aml`;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "gnew";
const JWT_ISSUER = process.env.JWT_ISSUER ?? "https://sso.example.com/";
const JWT_PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY ?? "").replace(/\\n/g, "\n");
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const pool = new Pool({ connectionString: DATABASE_URL });

export function computeScore(
  model: ModelCfg | null,
  features: Record<string, number>,
  sanctionHit: boolean,
  amount: number
): number {
  if (model) return scoreTx(features, model);
  if (sanctionHit) return 0.99;
  return 0.2 + Math.min(0.6, 0.01 * amount);
}

export function determineLevel(
  score: number,
  rules: { flag: boolean; escalateL2: boolean },
  thresholdL1: number,
  thresholdL2: number,
  sanctionHit: boolean
): "none" | "L1" | "L2" {
  if (sanctionHit || rules.escalateL2 || score >= thresholdL2) return "L2";
  if (rules.flag || score >= thresholdL1) return "L1";
  return "none";
}

export function statusFromAction(action: string): "l2_review" | "closed" | "ack" {
  switch (action) {
    case "escalate":
      return "l2_review";
    case "close":
      return "closed";
    default:
      return "ack";
  }
}

export function determineAction(
  mode: "shadow" | "enforced",
  level: "none" | "L1" | "L2"
): "block" | "allow" {
  if (mode === "enforced" && level === "L2") return "block";
  return "allow";
}

type User = { sub: string; roles?: string[]; email?: string };
const authOptional: express.RequestHandler = (req, res, next) => {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ") && JWT_PUBLIC_KEY) {
    try {
      const tok = h.slice(7);
      const dec = jwt.verify(tok, JWT_PUBLIC_KEY, {
        algorithms: ["RS256"],
        audience: JWT_AUDIENCE,
        issuer: JWT_ISSUER,
      }) as JwtPayload;
      res.locals.user = {
        sub: String(dec.sub),
        roles: dec.roles as string[] | undefined,
        email: dec.email as string | undefined,
      };
    } catch {
      /* ignore */
    }
  }
  next();
};
const requireRole = (role: string): express.RequestHandler => (req, res, next) => {
  const u: User | undefined = res.locals.user;
  if (!u?.roles?.includes(role)) return res.status(403).json({ error: "forbidden" });
  next();
};

const app: express.Express = express();
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));
app.use(authOptional);

// Health + migrate
app.get("/healthz", async (_req, res) => res.json({ ok: true }));
/* c8 ignore next */
app.post("/admin/migrate", requireRole("aml:admin"), async (_req, res) => {
  await ensureMigrations(pool);
  res.json({ ok: true });
});

// ---- Config/model/sanctions ----
const ModelIn = z.object({
  weights: z.record(z.number()),      // ej: {"amount":0.9,"velocity":0.6,...}
  bias: z.number(),
  means: z.record(z.number()).optional(),
  stds: z.record(z.number()).optional(),
  thresholdL1: z.number().min(0).max(1).default(0.75),
  thresholdL2: z.number().min(0).max(1).default(0.9),
  mode: z.enum(["shadow", "enforced"]).default("shadow")
});
app.post("/admin/model", requireRole("aml:admin"), async (req, res) => {
  const body = ModelIn.parse(req.body);
  await pool.query(
    `insert into aml_model(id, cfg) values('active', $1)
     on conflict (id) do update set cfg=$1, updated_at=now()`,
    [body]
  );
  res.json({ ok: true });
});
app.get("/admin/model", requireRole("aml:admin"), async (_req, res) => {
  const r = await pool.query("select cfg from aml_model where id='active'");
  res.json(r.rows[0]?.cfg ?? null);
});

const SanctionIn = z.object({
  type: z.enum(["person","entity","wallet"]).default("person"),
  name: z.string().min(1),
  country: z.string().optional(),
  wallet: z.string().optional(),
  doc: z.string().optional()
});
app.post("/admin/sanctions", requireRole("aml:admin"), async (req, res) => {
  const arr = z.array(SanctionIn).parse(req.body);
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const s of arr) {
      await client.query(
        `insert into sanctions(type,name,country,wallet,doc) values($1,$2,$3,$4,$5)
         on conflict (name,wallet) do update set type=excluded.type, country=excluded.country, doc=excluded.doc`,
        [s.type, s.name, s.country ?? null, s.wallet ?? null, s.doc ?? null]
      );
    }
    await client.query("commit");
    res.json({ ok: true, upserted: arr.length });
  } catch (e: unknown) {
    await client.query("rollback");
    res.status(400).json({ error: e instanceof Error ? e.message : "sanctions_error" });
  } finally {
    client.release();
  }
});

// ---- Ingest & detect ----
const TxIn = z.object({
  txId: z.string().default(() => uuidv4()),
  userId: z.string(),
  counterparty: z.string().optional(),
  amount: z.number().nonnegative(),
  currency: z.string().default("EUR"),
  countryFrom: z.string().optional(),
  countryTo: z.string().optional(),
  channel: z.enum(["card","bank","crypto","cash","p2p"]).default("bank"),
  ip: z.string().optional(),
  deviceId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  walletFrom: z.string().optional(),
  walletTo: z.string().optional(),
  kycLevel: z.enum(["low","std","high"]).default("std"),
  pepFlag: z.boolean().optional()
});

type TxInType = z.infer<typeof TxIn>;

const toFlag = (v: boolean): 0 | 1 => (v ? 1 : 0);

export function buildFeatures(body: TxInType, velocity: number, sanctionHit: boolean) {
  return {
    amount: body.amount,
    velocity,
    crossBorder: toFlag(Boolean(body.countryFrom && body.countryTo && body.countryFrom !== body.countryTo)),
    channelCrypto: toFlag(body.channel === "crypto"),
    kycLow: toFlag(body.kycLevel === "low"),
    pep: toFlag(Boolean(body.pepFlag)),
    sanction: toFlag(sanctionHit)
  };
}

function buildExplanations(model: ModelCfg | null, features: Record<string, number>) {
  if (model) return explainTx(features, model);
  return Object.fromEntries(Object.keys(features).map((k) => [k, 0]));
}

async function insertAlertIfNeeded(
  client: PoolClient,
  level: "none" | "L1" | "L2",
  score: number,
  txId: string,
  evidenceId: string,
  explanations: Record<string, number>,
  rules: { flag: boolean; escalateL2: boolean }
): Promise<string | null> {
  if (level === "none") return null;
  const r = await client.query(
    `insert into aml_alerts(level,status,score,tx_id,evidence_id,explanations,rules)
         values($1,'open',$2,$3,$4,$5,$6) returning id`,
    [level, score, txId, evidenceId, explanations, rules]
  );
  return r.rows[0].id as string;
}

app.post("/ingest/tx", requireRole("aml:ingest"), async (req, res) => {
  const body = TxIn.parse(req.body);
  const nowIso = new Date().toISOString();
  const client = await pool.connect();
  try {
    await client.query("begin");

    // Feature engineering (velocity: tx count last 10m)
    const { rows: vrows } = await client.query(
      `select count(1)::int as n
       from tx_events where user_id=$1 and ts > now() - interval '10 minutes'`,
      [body.userId]
    );
    const velocity = Number(vrows[0]?.n ?? 0);

    // Sanctions quick match
    const sMatch = await client.query(
      `select id,name,type,wallet from sanctions
       where (wallet is not null and (wallet=$1 or wallet=$2))
          or (lower(name)=lower($3) or lower(name)=lower($4)) limit 1`,
      [body.walletFrom ?? "", body.walletTo ?? "", body.userId, body.counterparty ?? ""]
    );
    const sanctionHit = (sMatch.rowCount ?? 0) > 0;

    // Load model
    const mrow = await client.query("select cfg from aml_model where id='active'");
    const model = mrow.rowCount ? mrow.rows[0].cfg : null;

    // Build features & explanations
    const features = buildFeatures(body, velocity, sanctionHit);
    const score = computeScore(model, features, sanctionHit, body.amount);
    const rules = checkRules({ ...body, velocity, sanctionHit });
    const explanations = buildExplanations(model, features);
    const evidencePayload = {
      tx: body,
      features,
      rules,
      explanations,
      score,
      ts: nowIso,
      sanctionRecord: sMatch.rows[0] ?? null
    };

    // Persist tx event
    await client.query(
      `insert into tx_events(tx_id,user_id,counterparty,amount,currency,channel,ts,raw)
       values($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (tx_id) do nothing`,
      [body.txId, body.userId, body.counterparty ?? null, body.amount, body.currency, body.channel, nowIso, evidencePayload]
    );

    // Thresholds and mode
    const thresholdL2 = Number(model?.thresholdL2 ?? 0.9);
    const thresholdL1 = Number(model?.thresholdL1 ?? 0.75);
    const mode = (model?.mode ?? "shadow") as "shadow" | "enforced";
    const level = determineLevel(score, rules, thresholdL1, thresholdL2, sanctionHit);

    // Always log detection (shadow or enforced), but only block if enforced & L2
    const evidence = await anchorEvidence(client, evidencePayload);
    const alertId = await insertAlertIfNeeded(
      client,
      level,
      score,
      body.txId,
      evidence.id,
      explanations,
      rules
    );

    await client.query("commit");
    res.status(201).json({
      ok: true,
      txId: body.txId,
      score,
      level,
      mode,
      action: determineAction(mode, level),
      alertId,
      evidenceHash: evidence.hash
    });
  } catch (e: unknown) {
    await client.query("rollback");
    res.status(500).json({ error: e instanceof Error ? e.message : "ingest_error" });
  } finally {
    client.release();
  }
});

// ---- Alerts workflow (L2) ----
app.get("/alerts/:id", requireRole("aml:read"), async (req, res) => {
  const { id } = req.params;
  const r = await pool.query(
    `select a.*, e.hash as evidence_hash, e.prev_hash, e.payload
     from aml_alerts a join aml_evidence e on e.id=a.evidence_id
     where a.id=$1`,
    [id]
  );
  if (!r.rowCount) return res.status(404).json({ error: "not_found" });
  res.json(r.rows[0]);
});

app.post("/alerts/:id/ack", requireRole("aml:analyst"), async (req, res) => {
  const { id } = req.params;
  const action = String(req.body?.action ?? "ack"); // ack|escalate|close
  const allowed = new Set(["ack","escalate","close"]);
  if (!allowed.has(action)) return res.status(400).json({ error: "bad_action" });
  const status = statusFromAction(action);
  const r = await pool.query(
    `update aml_alerts set status=$2, updated_at=now() where id=$1 returning *`,
    [id, status]
  );
  if (!r.rowCount) return res.status(404).json({ error: "not_found" });
  res.json(r.rows[0]);
});

// Metrics
app.get("/metrics", requireRole("aml:read"), async (_req, res) => {
  const r = await pool.query(
    `select
       (select count(*) from aml_alerts where level='L2' and status='open')::int as open_l2,
       (select count(*) from aml_alerts where level='L1' and status='open')::int as open_l1,
       (select count(*) from aml_alerts)::int as total_alerts`
  );
  res.json(r.rows[0]);
});

// Bootstrap
/* c8 ignore next */
if (require.main === module) {
  ensureMigrations(pool)
    .then(() => app.listen(PORT, () => logger.info({ msg: `aml-service listening on :${PORT}` })))
    .catch((e) => { logger.error(e, "migration_failed"); process.exit(1); });
}

export default app;


