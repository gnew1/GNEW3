
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * GET /metrics?userId=abc&projectId=xyz
 */
router.get("/", async (req, res) => {
  try {
    const { userId, projectId } = req.query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (projectId) where.projectId = projectId;

    const results = await prisma.contribution.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json(results);
  } catch (err) {
    console.error("Error fetching metrics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as listMetricsRouter };


