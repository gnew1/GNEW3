
import express from "express";
import { collectDefaultMetrics, Registry, Counter, Gauge } from "prom-client";
import { api } from "./api";
import pino from "pino";

const app = express();
const log = pino();
export const register = new Registry();
collectDefaultMetrics({ register });

// Metrics
const quickstartRuns = new Counter({
  name: "gnew_quickstart_runs_total",
  help: "Total number of quickstart runs recorded",
  labelNames: ["lang"],
});
const quickstartLatency = new Gauge({
  name: "gnew_quickstart_latency_seconds",
  help: "Observed time to demo (T2D) per run",
  labelNames: ["lang"],
});
register.registerMetric(quickstartRuns);
register.registerMetric(quickstartLatency);

// Endpoint: receive run data from T2D checker
app.use(express.json());
app.post("/api/record", (req, res) => {
  const { lang, minutes } = req.body ?? {};
  if (!lang || typeof minutes !== "number") {
    return res.status(400).json({ error: "lang and minutes required" });
  }
  quickstartRuns.inc({ lang });
  quickstartLatency.set({ lang }, minutes * 60);
  log.info({ lang, minutes }, "Recorded quickstart run");
  res.json({ ok: true });
});

// API router (derived metrics)
app.use("/api", api);

// Metrics endpoint
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

const port = Number(process.env.PORT ?? 9090);
app.listen(port, () => log.info({ port }, "DevRel metrics up"));


