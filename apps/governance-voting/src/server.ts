
import express from "express";
import pino from "pino";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const log = pino();
const app = express();
app.use(express.json());

/**
 * Governance Voting Service
 * Allows members to create proposals and cast votes within GNEW.
 */
type Proposal = {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: number;
  votes: Record<string, "yes"|"no"|"abstain">;
};

const proposals: Record<string, Proposal> = {};

const ProposalSchema = z.object({
  title: z.string(),
  description: z.string(),
  createdBy: z.string()
});

const VoteSchema = z.object({
  voter: z.string(),
  choice: z.enum(["yes","no","abstain"])
});

// Create proposal
app.post("/api/voting/proposals", (req,res) => {
  const parsed = ProposalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const id = uuidv4();
  proposals[id] = { ...parsed.data, id, createdAt: Date.now(), votes:{} };
  log.info({ proposal: proposals[id] }, "Proposal created");
  res.status(201).json(proposals[id]);
});

// List proposals
app.get("/api/voting/proposals", (_req,res) => {
  res.json(Object.values(proposals));
});

// Vote on proposal
app.post("/api/voting/proposals/:id/vote", (req,res) => {
  const { id } = req.params;
  const parsed = VoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const proposal = proposals[id];
  if (!proposal) return res.status(404).json({ error: "Not found" });
  proposal.votes[parsed.data.voter] = parsed.data.choice;
  log.info({ id, voter: parsed.data.voter, choice: parsed.data.choice }, "Vote recorded");
  res.json(proposal);
});

// Tally proposal
app.get("/api/voting/proposals/:id/tally", (req,res) => {
  const { id } = req.params;
  const proposal = proposals[id];
  if (!proposal) return res.status(404).json({ error: "Not found" });
  const tally = { yes:0, no:0, abstain:0 };
  for (const c of Object.values(proposal.votes)) tally[c]++;
  res.json({ proposalId:id, tally });
});

const port = Number(process.env.PORT ?? 9210);
app.listen(port, () => log.info({ port }, "Governance Voting service running"));


