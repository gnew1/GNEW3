
import { Router } from "express";

export const governanceRouter = Router();

interface Proposal {
  id: string;
  title: string;
  description: string;
  votesFor: number;
  votesAgainst: number;
}

const proposals: Proposal[] = [];

governanceRouter.get("/proposals", (req, res) => {
  res.json(proposals);
});

governanceRouter.post("/proposals", (req, res) => {
  const { id, title, description } = req.body;
  if (!id || !title) {
    return res.status(400).json({ error: "Proposal must include id and title." });
  }
  const newProposal: Proposal = { id, title, description, votesFor: 0, votesAgainst: 0 };
  proposals.push(newProposal);
  res.status(201).json(newProposal);
});

governanceRouter.post("/vote", (req, res) => {
  const { id, vote } = req.body;
  const proposal = proposals.find((p) => p.id === id);
  if (!proposal) {
    return res.status(404).json({ error: "Proposal not found." });
  }

  if (vote === "for") {
    proposal.votesFor += 1;
  } else if (vote === "against") {
    proposal.votesAgainst += 1;
  } else {
    return res.status(400).json({ error: "Vote must be 'for' or 'against'." });
  }

  res.json(proposal);
});


