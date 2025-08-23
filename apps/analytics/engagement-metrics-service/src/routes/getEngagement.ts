
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * GET /engagement/:userId
 * returns aggregated engagement metrics for a user
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const metrics = await prisma.engagementMetric.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const totalLikes = metrics.reduce((sum, m) => sum + (m.likes || 0), 0);
    const totalComments = metrics.reduce((sum, m) => sum + (m.comments || 0), 0);
    const totalShares = metrics.reduce((sum, m) => sum + (m.shares || 0), 0);

    res.json({
      userId,
      totalLikes,
      totalComments,
      totalShares,
      recent: metrics,
    });
  } catch (err) {
    console.error("Error fetching engagement metrics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as getEngagementRouter };


