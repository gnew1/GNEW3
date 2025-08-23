
import { Router } from "express";
import { getResults, submitVote } from "../services/resultService";

const router = Router();

/**
 * GET /results/:proposalId
 * Fetch aggregated results for a proposal
 */
router.get("/:proposalId", async (req, res) => {
  try {
    const { proposalId } = req.params;
    const results = await getResults(proposalId);
    res.json(results);
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /results/vote
 * body: { proposalId: string, userId: string, vote: "yes"|"no"|"abstain" }
 */
router.post("/vote", async (req, res) => {
  try {
    const { proposalId, userId, vote } = req.body;
    if (!proposalId || !userId || !vote) {
      return res
        .status(400)
        .json({ error: "proposalId, userId and vote are required" });
    }
    const updated = await submitVote(proposalId, userId, vote);
    res.json(updated);
  } catch (err) {
    console.error("Error submitting vote:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as resultsRouter };


