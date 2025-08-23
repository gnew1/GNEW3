
import express, { Request, Response } from "express";
import {
  collectProposalMetrics,
  collectVotingMetrics,
  collectSystemMetrics,
} from "../metrics/collector";

const router = express.Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const [proposalMetrics, votingMetrics, systemMetrics] =
      await Promise.all([
        collectProposalMetrics(),
        collectVotingMetrics(),
        collectSystemMetrics(),
      ]);

    res.json({
      proposalMetrics,
      votingMetrics,
      systemMetrics,
    });
  } catch (err) {
    console.error("Error collecting metrics:", err);
    res.status(500).json({ error: "Failed to collect metrics" });
  }
});

export default router;


