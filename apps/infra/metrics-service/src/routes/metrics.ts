
import { Router } from "express";

export const metricsRouter = Router();

interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

const metrics: Metric[] = [];

metricsRouter.post("/", (req, res) => {
  const { name, value, unit } = req.body;

  if (!name || typeof value !== "number" || !unit) {
    return res.status(400).json({ error: "name, value and unit are required." });
  }

  const newMetric: Metric = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    name,
    value,
    unit,
    timestamp: Date.now(),
  };

  metrics.push(newMetric);
  res.status(201).json(newMetric);
});

metricsRouter.get("/", (_req, res) => {
  res.json(metrics);
});


