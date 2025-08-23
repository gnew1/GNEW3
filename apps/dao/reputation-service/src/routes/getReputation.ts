
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * GET /reputation?userId=abc
 */
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId is required" });
    }

    const reputation = await prisma.reputation.findUnique({
      where: { userId },
    });

    if (!reputation) {
      return res.json({ userId, score: 0 });
    }

    res.json(reputation);
  } catch (err) {
    console.error("Error fetching reputation:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as getReputationRouter };


