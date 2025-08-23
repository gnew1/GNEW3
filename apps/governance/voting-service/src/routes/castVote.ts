
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * POST /vote
 * body: { proposalId: string, userId: string, choice: "yes" | "no" | "abstain" }
 */
router.post("/", async (req, res) => {
  try {
    const { proposalId, userId, choice } = req.body;

    if (!proposalId || !userId || !choice) {
      return res.status(400).json({ error: "proposalId, userId and choice are required" });
    }

    const existingVote = await prisma.vote.findFirst({
      where: { proposalId, userId },
    });

    if (existingVote) {
      return res.status(400).json({ error: "User already voted for this proposal" });
    }

    const vote = await prisma.vote.create({
      data: { proposalId, userId, choice, createdAt: new Date() },
    });

    res.json(vote);
  } catch (err) {
    console.error("Error casting vote:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as castVoteRouter };


