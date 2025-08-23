
import express from "express";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

// In-memory registry
const guilds: Record<string, { id: string; name: string; specialties: string[]; representative?: string }> = {};

const GuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialties: z.array(z.string()).min(1),
  representative: z.string().optional()
});

// Register guild
app.post("/api/guilds", (req, res) => {
  const parsed = GuildSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const guild = parsed.data;
  guilds[guild.id] = guild;
  log.info({ guild }, "Guild registered");
  res.status(201).json(guild);
});

// List guilds
app.get("/api/guilds", (_req, res) => {
  res.json(Object.values(guilds));
});

// Assign representative
app.post("/api/guilds/:id/representative", (req, res) => {
  const { id } = req.params;
  const { representative } = req.body;
  if (!guilds[id]) return res.status(404).json({ error: "Guild not found" });
  guilds[id].representative = representative;
  log.info({ id, representative }, "Representative assigned");
  res.json(guilds[id]);
});

const port = Number(process.env.PORT ?? 9100);
app.listen(port, () => log.info({ port }, "Guild Registry service up"));


