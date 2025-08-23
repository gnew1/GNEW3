
import { Router } from "express";

export const metricsRouter = Router();

// Simulación de datos de métricas
const mockMetrics = [
  { timestamp: "2025-08-01", activeUsers: 230, proposals: 14, rewardsDistributed: 430 },
  { timestamp: "2025-08-05", activeUsers: 280, proposals: 19, rewardsDistributed: 580 },
  { timestamp: "2025-08-10", activeUsers: 320, proposals: 25, rewardsDistributed: 770 },
  { timestamp: "2025-08-15", activeUsers: 290, proposals: 20, rewardsDistributed: 690 },
  { timestamp: "2025-08-20", activeUsers: 350, proposals: 30, rewardsDistributed: 910 }
];

metricsRouter.get("/", async (_req, res) => {
  res.json(mockMetrics);
});


