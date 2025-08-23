
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * POST /reputation
 * body: { userId: string, delta: number }
 */
router.post("/", async (req, res) => {
  try {
    const { userId, delta } = req.body;

    if (!userId || typeof delta !== "number") {
      return res.status(400).json({ error: "userId and delta are required" });
    }

    const reputation = await prisma.reputation.upsert({
      where: { userId },
      update: { score: { increment: delta } },
      create: { userId, score: delta },
    });

    res.json(reputation);
  } catch (err) {
    console.error("Error updating reputation:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as updateReputationRouter };


