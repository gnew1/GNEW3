
import express, { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";

const router = express.Router();

const voteSchema = z.object({
  proposalId: z.string().uuid(),
  voterId: z.string().uuid(),
  choice: z.enum(["yes", "no", "abstain"]),
});

// POST /votes — create or update a vote
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = voteSchema.parse(req.body);

    const vote = await prisma.vote.upsert({
      where: {
        proposalId_voterId: {
          proposalId: parsed.proposalId,
          voterId: parsed.voterId,
        },
      },
      update: { choice: parsed.choice },
      create: {
        proposalId: parsed.proposalId,
        voterId: parsed.voterId,
        choice: parsed.choice,
      },
    });

    res.json(vote);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /votes/:proposalId — get all votes for a proposal
router.get("/:proposalId", async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;

    const votes = await prisma.vote.findMany({
      where: { proposalId },
    });

    res.json(votes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


