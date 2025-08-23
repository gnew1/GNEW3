
import { Router } from "express";

export const metricsRouter = Router();

interface Metric {
  id: string;
  service: string;
  metric: string;
  value: number;
  timestamp: number;
}

const metrics: Metric[] = [];

metricsRouter.post("/", (req, res) => {
  const { service, metric, value } = req.body;
  if (!service || !metric || value === undefined) {
    return res.status(400).json({ error: "Service, metric and value are required." });
  }

  const newMetric: Metric = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    service,
    metric,
    value: Number(value),
    timestamp: Date.now(),
  };

  metrics.push(newMetric);
  res.status(201).json(newMetric);
});

metricsRouter.get("/", (req, res) => {
  const { service } = req.query;
  if (service) {
    return res.json(metrics.filter((m) => m.service === service));
  }
  res.json(metrics);
});


