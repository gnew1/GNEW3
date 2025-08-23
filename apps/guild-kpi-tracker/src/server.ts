
import express from "express";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

type KPI = { id: string; guildId: string; metric: string; value: number; timestamp: number };
const kpis: KPI[] = [];

const KPISchema = z.object({
  id: z.string(),
  guildId: z.string(),
  metric: z.string(),
  value: z.number()
});

// Record KPI
app.post("/api/kpis", (req,res) => {
  const parsed = KPISchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const kpi = { ...parsed.data, timestamp: Date.now() };
  kpis.push(kpi);
  log.info({ kpi }, "KPI recorded");
  res.status(201).json(kpi);
});

// List KPIs per guild
app.get("/api/kpis/:guildId", (req,res) => {
  const { guildId } = req.params;
  res.json(kpis.filter(k => k.guildId === guildId));
});

// Aggregate KPI per guild
app.get("/api/kpis/:guildId/aggregate", (req,res) => {
  const { guildId } = req.params;
  const subset = kpis.filter(k => k.guildId === guildId);
  const agg: Record<string,{count:number;avg:number}> = {};
  for (const k of subset) {
    if (!agg[k.metric]) agg[k.metric] = { count: 0, avg: 0 };
    agg[k.metric].count++;
    agg[k.metric].avg = ((agg[k.metric].avg


