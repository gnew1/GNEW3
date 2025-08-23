
import express from "express";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

/**
 * Resource Allocation Service
 * Assigns limited GNEW resources (tokens, time slots, compute units) to guild projects.
 */
type Allocation = { projectId: string; guildId: string; resource: string; amount: number; timestamp: number };
const allocations: Allocation[] = [];

const AllocationSchema = z.object({
  projectId: z.string(),
  guildId: z.string(),
  resource: z.string(),
  amount: z.number().positive()
});

// Create allocation
app.post("/api/resource-allocation", (req,res) => {
  const parsed = AllocationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const record: Allocation = { ...parsed.data, timestamp: Date.now() };
  allocations.push(record);
  log.info({ record }, "Resource allocated");
  res.status(201).json(record);
});

// Get allocations by guild
app.get("/api/resource-allocation/:guildId", (req,res) => {
  const { guildId } = req.params;
  res.json(allocations.filter(a => a.guildId===guildId));
});

// Get allocations by project
app.get("/api/resource-allocation/project/:projectId", (req,res) => {
  const { projectId } = req.params;
  res.json(allocations.filter(a => a.projectId===projectId));
});

const port = Number(process.env.PORT ?? 9190);
app.listen(port, () => log.info({ port }, "Resource Allocation service running"));


