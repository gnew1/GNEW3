
import express from "express";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

const KPISchema = z.object({
  guildId: z.string(),
  metric: z.string(),
  value: z.number(),
  timestamp: z.number().optional()
});

type KPIRecord = {
  guildId: string;
  metric: string;
  value: number;
  timestamp: number;
};

const kpis: KPIRecord[] = [];

// Submit KPI
app.post("/api/kpis", (req,res) => {
  const parsed = KPISchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const record: KPIRecord = {
    ...parsed.data,
    timestamp: parsed.data.timestamp ?? Date.now()
  };
  kpis.push(record);
  log.info({ record }, "KPI recorded");
  res.status(201).json(record);
});

// List KPIs
app.get("/api/kpis", (_req,res) => {
  res.json(kpis);
});

// KPIs by guild
app.get("/api/kpis/:guildId", (req,res) => {
  const { guildId } = req.params;
  res.json(kpis.filter(k => k.guildId === guildId));
});

const port = Number(process.env.PORT ?? 9120);
app.listen(port, () => log.info({ port }, "KPI Tracker service up"));


