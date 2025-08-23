
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * GET /results/:proposalId
 * returns aggregated votes for a proposal
 */
router.get("/:proposalId", async (req, res) => {
  try {
    const { proposalId } = req.params;

    const votes = await prisma.vote.findMany({ where: { proposalId } });

    const results = votes.reduce(
      (acc, v) => {
        acc[v.choice] = (acc[v.choice] || 0) + 1;
        return acc;
      },
      { yes: 0, no: 0, abstain: 0 } as Record<string, number>
    );

    res.json({ proposalId, results, totalVotes: votes.length });
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as getResultsRouter };


