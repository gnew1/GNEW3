
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * POST /metrics
 * body: { userId: string, projectId: string, tokensEarned: number }
 */
router.post("/", async (req, res) => {
  try {
    const { userId, projectId, tokensEarned } = req.body;

    if (!userId || !projectId || typeof tokensEarned !== "number") {
      return res
        .status(400)
        .json({ error: "userId, projectId and tokensEarned are required" });
    }

    const contribution = await prisma.contribution.create({
      data: {
        userId,
        projectId,
        tokensEarned,
      },
    });

    res.status(201).json(contribution);
  } catch (err) {
    console.error("Error adding contribution:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as addContributionRouter };


