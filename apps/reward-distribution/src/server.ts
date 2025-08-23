
import express from "express";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

type Reward = { id: string; guildId: string; memberId: string; token: string; amount: number; timestamp: number };
const rewards: Reward[] = [];

const RewardSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  memberId: z.string(),
  token: z.string(),
  amount: z.number().positive()
});

// Distribute reward
app.post("/api/rewards", (req,res) => {
  const parsed = RewardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const reward: Reward = { ...parsed.data, timestamp: Date.now() };
  rewards.push(reward);
  log.info({ reward }, "Reward distributed");
  res.status(201).json(reward);
});

// List rewards for guild
app.get("/api/rewards/:guildId", (req,res) => {
  const { guildId } = req.params;
  res.json(rewards.filter(r => r.guildId === guildId));
});

// Member rewards
app.get("/api/rewards/:guildId/:memberId", (req,res) => {
  const { guildId, memberId } = req.params;
  res.json(rewards.filter(r => r.guildId===guildId && r.memberId===memberId));
});

const port = Number(process.env.PORT ?? 9150);
app.listen(port, () => log.info({ port }, "Reward Distribution service up"));


