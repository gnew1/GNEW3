
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * Obtener métricas filtradas
 * query: ?service=string&metric=string&limit=number
 */
router.get("/", async (req, res) => {
  try {
    const { service, metric, limit } = req.query;

    const where: any = {};
    if (service) where.service = service;
    if (metric) where.metric = metric;

    const results = await prisma.metric.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json(results);
  } catch (err) {
    console.error("Error fetching metrics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as getMetricsRouter };


