
import express from "express";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

type Task = {
  id: string;
  guildId: string;
  title: string;
  description: string;
  assignee: string | null;
  status: "open" | "in-progress" | "done";
  createdAt: number;
};

const tasks: Record<string, Task> = {};

const TaskSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  title: z.string(),
  description: z.string()
});

// Create task
app.post("/api/tasks", (req,res) => {
  const parsed = TaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const task: Task = { ...parsed.data, assignee:null, status:"open", createdAt:Date.now() };
  tasks[task.id] = task;
  log.info({ task }, "Task created");
  res.status(201).json(task);
});

// Assign task
app.post("/api/tasks/:id/assign", (req,res) => {
  const { id } = req.params;
  const { memberId } = req.body;
  const task = tasks[id];
  if (!task) return res.status(404).json({ error: "Task not found" });
  task.assignee = memberId;
  task.status = "in-progress";
  res.json(task);
});

// Complete task
app.post("/api/tasks/:id/complete", (req,res) => {
  const { id } = req.params;
  const task = tasks[id];
  if (!task) return res.status(404).json({ error: "Task not found" });
  task.status = "done";
  res.json(task);
});

// List tasks by guild
app.get("/api/tasks/:guildId", (req,res) => {
  const { guildId } = req.params;
  res.json(Object.values(tasks).filter(t => t.guildId===guildId));
});

const port = Number(process.env.PORT ?? 9160);
app.listen(port, () => log.info({ port }, "Task Assignment service up"));


