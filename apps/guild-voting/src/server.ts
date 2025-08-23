
import express from "express";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

// In-memory proposals and votes
const proposals: Record<string, { id: string; guildId: string; title: string; options: string[]; votes: Record<string,string> }> = {};

const ProposalSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  title: z.string(),
  options: z.array(z.string()).min(2)
});

// Create proposal
app.post("/api/proposals", (req,res) => {
  const parsed = ProposalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const proposal = { ...parsed.data, votes: {} };
  proposals[proposal.id] = proposal;
  log.info({ proposal }, "Proposal created");
  res.status(201).json(proposal);
});

// List proposals
app.get("/api/proposals", (_req,res) => {
  res.json(Object.values(proposals));
});

// Vote on proposal
app.post("/api/proposals/:id/vote", (req,res) => {
  const { id } = req.params;
  const { memberId, option } = req.body;
  if (!proposals[id]) return res.status(404).json({ error: "Proposal not found" });
  if (!proposals[id].options.includes(option)) return res.status(400).json({ error: "Invalid option" });
  proposals[id].votes[memberId] = option;
  log.info({ id, memberId, option }, "Vote recorded");
  res.json(proposals[id]);
});

// Results
app.get("/api/proposals/:id/results", (req,res) => {
  const { id } = req.params;
  const prop = proposals[id];
  if (!prop) return res.status(404).json({ error: "Proposal not found" });
  const tally: Record<string,number> = {};
  for (const opt of prop.options) tally[opt] = 0;
  for (const vote of Object.values(prop.votes)) tally[vote]++;
  res.json({ id, title: prop.title, results: tally });
});

const port = Number(process.env.PORT ?? 9110);
app.listen(port, () => log.info({ port }, "Guild Voting service up"));


