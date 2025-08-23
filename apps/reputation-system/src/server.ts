
import express from "express";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

/**
 * Reputation System: members accumulate points for contributions, tasks, validations.
 */
type Reputation = { guildId: string; memberId: string; points: number };
const reputations: Record<string, Reputation> = {};

const ReputationEventSchema = z.object({
  guildId: z.string(),
  memberId: z.string(),
  delta: z.number()
});

// Add or subtract reputation
app.post("/api/reputation/update", (req,res) => {
  const parsed = ReputationEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const { guildId, memberId, delta } = parsed.data;
  const key = `${guildId}:${memberId}`;
  if (!reputations[key]) reputations[key] = { guildId, memberId, points: 0 };
  reputations[key].points += delta;
  log.info({ guildId, memberId, delta }, "Reputation updated");
  res.json(reputations[key]);
});

// Get member reputation
app.get("/api/reputation/:guildId/:memberId", (req,res) => {
  const { guildId, memberId } = req.params;
  const key = `${guildId}:${memberId}`;
  res.json(reputations[key] ?? { guildId, memberId, points: 0 });
});

// Leaderboard by guild
app.get("/api/reputation/:guildId", (req,res) => {
  const { guildId } = req.params;
  const list = Object.values(reputations)
    .filter(r => r.guildId===guildId)
    .sort((a,b) => b.points - a.points);
  res.json(list);
});

const port = Number(process.env.PORT ?? 9180);
app.listen(port, () => log.info({ port }, "Reputation System service running"));


