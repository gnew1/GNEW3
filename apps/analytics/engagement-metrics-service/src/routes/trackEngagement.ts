
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * POST /engagement
 * body: { userId: string, likes?: number, comments?: number, shares?: number }
 */
router.post("/", async (req, res) => {
  try {
    const { userId, likes, comments, shares } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const metric = await prisma.engagementMetric.create({
      data: {
        userId,
        likes: likes || 0,
        comments: comments || 0,
        shares: shares || 0,
        createdAt: new Date(),
      },
    });

    res.json(metric);
  } catch (err) {
    console.error("Error tracking engagement:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as trackEngagementRouter };


