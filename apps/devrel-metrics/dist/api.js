import express from "express";
import { register } from "prom-client";
export const api = express.Router();
// Derived endpoint to power dashboard
api.get("/metrics/quickstarts", async (_req, res) => {
    const metrics = (await register.getMetricsAsJSON());
    const runs = metrics.find((m) => m.name === "gnew_quickstart_runs_total");
    const latency = metrics.find((m) => m.name === "gnew_quickstart_latency_seconds");
    const langs = new Set();
    runs?.values.forEach((v) => langs.add(v.labels.lang));
    latency?.values.forEach((v) => langs.add(v.labels.lang));
    const out = [...langs].map((lang) => {
        const r = runs?.values.find((v) => v.labels.lang === lang);
        const l = latency?.values.find((v) => v.labels.lang === lang);
        const runsCount = r?.value ?? 0;
        const avg = runsCount > 0 ? (l?.value ?? 0) / runsCount : 0;
        return { lang, runs: runsCount, avgSeconds: avg };
    });
    res.json(out);
});
