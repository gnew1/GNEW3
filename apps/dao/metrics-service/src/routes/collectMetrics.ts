
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * Recibir y guardar métricas de un microservicio
 * body: { service: string, metric: string, value: number }
 */
router.post("/", async (req, res) => {
  try {
    const { service, metric, value } = req.body;

    if (!service || !metric || typeof value !== "number") {
      return res
        .status(400)
        .json({ error: "service, metric and numeric value are required" });
    }

    const saved = await prisma.metric.create({
      data: {
        service,
        metric,
        value,
      },
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error("Error saving metric:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as collectMetricsRouter };


