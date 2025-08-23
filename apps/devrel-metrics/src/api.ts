
import express from "express";
import { register } from "prom-client";

export const api = express.Router();

// Derived endpoint to power dashboard
api.get("/metrics/quickstarts", async (_req, res) => {
  const metrics = await register.getMetricsAsJSON();
  const runs = metrics.find(m => m.name === "gnew_quickstart_runs_total");
  const latency = metrics.find(m => m.name === "gnew_quickstart_latency_seconds");

  const langs = new Set<string>();
  runs?.values.forEach(v => langs.add(v.labels.lang));
  latency?.values.forEach(v => langs.add(v.labels.lang));

  const out = [...langs].map(lang => {
    const r = runs?.values.find(v => v.labels.lang === lang);
    const l = latency?.values.find(v => v.labels.lang === lang);
    const runsCount = r?.value ?? 0;
    const avg = runsCount > 0 ? (l?.value ?? 0) / runsCount : 0;
    return { lang, runs: runsCount, avgSeconds: avg };
  });

  res.json(out);
});


/apps/devrel-metrics/src/server.ts (patched)

import express from "express";
import { collectDefaultMetrics, Registry, Counter, Gauge } from "prom-client";
import pino from "pino";
import { api } from "./api";

const app = express();
const log = pino();
export const register = new Registry();
collectDefaultMetrics({ register });

const quickstartRuns = new Counter({ name: "gnew_quickstart_runs_total", help: "Total quickstart runs", labelNames: ["lang"] });
const quickstartLatency = new Gauge({ name: "gnew_quickstart_latency_seconds", help: "Observed T2D (seconds)", labelNames: ["lang"] });
register.registerMetric(quickstartRuns);
register.registerMetric(quickstartLatency);

app.use(express.json());
app.post("/api/record", (req, res) => {
  const { lang, minutes } = req.body ?? {};
  if (!lang || typeof minutes !== "number") return res.status(400).json({ error: "bad input" });
  quickstartRuns.inc({ lang });
  quickstartLatency.inc({ lang }, minutes * 60);
  res.json({ ok: true });
});
app.use("/api", api);

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

const port = Number(process.env.PORT ?? 9090);
app.listen(port, () => log.info({ port }, "DevRel metrics up"));


