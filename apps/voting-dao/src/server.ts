
import express from "express";
import pino from "pino";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const log = pino();
const app = express();
app.use(express.json());

/**
 * Voting DAO Service
 * Members vote with their tokens: Gnew0 (survey-like, weighted) and Gnews (binding).
 */
type Vote = {
  id: string;
  proposalId: string;
  userId: string;
  token: "Gnew0" | "Gnews";
  weight: number;
  createdAt: number;
};

type Proposal = {
  id: string;
  title: string;
  description: string;
  createdAt: number;
};

const proposals: Proposal[] = [];
const votes: Vote[] = [];

const ProposalSchema = z.object({
  title: z.string(),
  description: z.string()
});

const VoteSchema = z.object({
  proposalId: z.string(),
  userId: z.string(),
  token: z.enum(["Gnew0","Gnews"]),
  weight: z.number().positive()
});

// Create proposal
app.post("/api/dao/proposals", (req,res) => {
  const parsed = ProposalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const proposal: Proposal = { id: uuidv4(), ...parsed.data, createdAt: Date.now() };
  proposals.push(proposal);
  res.status(201).json(proposal);
});

// List proposals
app.get("/api/dao/proposals", (_req,res) => {
  res.json(proposals);
});

// Cast vote
app.post("/api/dao/votes", (req,res) => {
  const parsed = VoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const vote: Vote = { id: uuidv4(), ...parsed.data, createdAt: Date.now() };
  votes.push(vote);
  res.status(201).json(vote);
});

// Tally votes
app.get("/api/dao/tally


