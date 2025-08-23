
import express from "express";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

/**
 * Collect and analyze voting data across guilds.
 */
type VoteRecord = { proposalId: string; guildId: string; memberId: string; option: string; timestamp: number };
const votes: VoteRecord[] = [];

const VoteSchema = z.object({
  proposalId: z.string(),
  guildId: z.string(),
  memberId: z.string(),
  option: z.string()
});

// Record a vote (analytics only, not governance logic)
app.post("/api/voting-analytics/vote", (req,res) => {
  const parsed = VoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const rec: VoteRecord = { ...parsed.data, timestamp: Date.now() };
  votes.push(rec);
  log.info({ rec }, "Vote recorded in analytics");
  res.status(201).json(rec);
});

// Analytics by guild
app.get("/api/voting-analytics/:guildId", (req,res) => {
  const { guildId } = req.params;
  const subset = votes.filter(v => v.guildId===guildId);
  const tally: Record<string, number> = {};
  for (const v of subset) tally[v.option] = (tally[v.option]||0)+1;
  res.json({ guildId, total: subset.length, distribution: tally });
});

// Analytics by proposal
app.get("/api/voting-analytics/proposal/:proposalId", (req,res) => {
  const { proposalId } = req.params;
  const subset = votes.filter(v => v.proposalId===proposalId);
  const tally: Record<string, number> = {};
  for (const v of subset) tally[v.option] = (tally[v.option]||0)+1;
  res.json({ proposalId, total: subset.length, distribution: tally });
});

const port = Number(process.env.PORT ?? 9170);
app.listen(port, () => log.info({ port }, "Voting Analytics service running"));


