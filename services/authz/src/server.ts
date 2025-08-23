import express from "express";
import helmet from "helmet";
import { collectDefaultMetrics, Histogram, Counter, register } from "prom-client";
import pino from "pino";
import { v4 as uuidv4 } from "uuid";
import LRU from "lru-cache";
import fs from "node:fs/promises";
import path from "node:path";
import { buildEnforcer } from "./casbin/enforcer";
import { PolicyWatcher, ActivePolicy } from "./chain/watcher";
import type { DecisionInput, Decision } from "./types";

const log = pino({ level: process.env.LOG_LEVEL || "info" });
collectDefaultMetrics();
const H = new Histogram({ name: "authz_eval_ms", help: "Latency of authz decisions", buckets: [5,10,20,30,40,50,75,100,200] });
const C = new Counter({ name: "authz_requests_total", help: "Count decisions", labelNames: ["allowed"] });

const app = express();
app.use(express.json({ limit: "128kb" }));
app.use(helmet());

let policyVersion = 0;
let enforcer: any;
const cache = new LRU<string, { decision: boolean; v: number }>({ max: 5000, ttl: 30_000 }); // 30s

// Bootstrap: carga local y arranca watcher
const rpc = process.env.CHAIN_RPC ?? "http://localhost:8545";
const registryAddr = process.env.POLICY_REGISTRY ?? "0x0000000000000000000000000000000000000000";
const watcher = new PolicyWatcher(rpc, registryAddr);

async function loadLocalPolicy() {
  const model = await fs.readFile(path.resolve("policies/authz/model.conf"), "utf8");
  const policy = await fs.readFile(path.resolve("policies/authz/policy.csv"), "utf8");
  enforcer = await buildEnforcer(model, policy);
  policyVersion = Number(process.env.LOCAL_POLICY_VERSION || 1);
  log.warn({ policyVersion }, "Using LOCAL policy (no on-chain registry configured or unreachable)");
}

watcher.start({
  onPolicyLoaded: async (p: ActivePolicy) => {
    enforcer = await buildEnforcer(p.model, p.policy);
    policyVersion = p.version;
    cache.clear();
    log.info({ version: p.version, uri: p.uri }, "Policy activated from chain");
  },
  onError: (err) => log.error({ err }, "Policy watcher error")
});

// Si el contrato no está configurado, usar local
if (!process.env.POLICY_REGISTRY || process.env.POLICY_REGISTRY?.match(/^0x0+$/)) {
  loadLocalPolicy();
} else {
  // Intentar cargar la actual inmediatamente
  watcher.current().then(async (p) => {
    enforcer = await buildEnforcer(p.model, p.policy);
    policyVersion = p.version;
    log.info({ version: p.version }, "Bootstrapped policy from chain");
  }).catch(async () => loadLocalPolicy());
}

app.get("/healthz", (_req, res) => res.json({ ok: true, policyVersion }));

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.post("/authz/evaluate", async (req, res) => {
  const start = performance.now();
  const decisionId = uuidv4();
  const input = req.body as DecisionInput;

  const cacheKey = JSON.stringify([policyVersion, input.sub.role, input.sub.id, input.obj, input.act, input.ctx?.tenant, input.ctx?.projectOwnerId]);
  const cached = cache.get(cacheKey);
  if (cached && cached.v === policyVersion) {
    const latency = performance.now() - start;
    H.observe(latency);
    C.labels(String(cached.decision)).inc();
    log.info({ decisionId, latency, policyVersion, cached: true, allowed: cached.decision, sub: input.sub.id, role: input.sub.role, obj: input.obj, act: input.act, tenant: input.ctx?.tenant }, "authz decision");
    const out: Decision = { allowed: cached.decision, policyVersion, decisionId, latencyMs: Math.round(latency) };
    return res.set("X-Decision-Id", decisionId).json(out);
  }

  // El subject disponible en matcher como r.sub.*, y contexto r.ctx.*
  const allowed = await enforcer.enforce(input.sub, input.obj, input.act, input.ctx ?? {});
  const latency = performance.now() - start;
  H.observe(latency);
  C.labels(String(allowed)).inc();
  cache.set(cacheKey, { decision: allowed, v: policyVersion });

  log.info({ decisionId, latency, policyVersion, allowed, sub: input.sub.id, role: input.sub.role, obj: input.obj, act: input.act, tenant: input.ctx?.tenant }, "authz decision");
  const out: Decision = { allowed, policyVersion, decisionId, latencyMs: Math.round(latency) };
  return res.set("X-Decision-Id", decisionId).json(out);
});

const PORT = Number(process.env.PORT || 8030);
app.listen(PORT, () => log.info(`authz service on :${PORT}`));

