
import express from "express";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

/**
 * Project Tracking Service
 * Tracks milestones, tasks, and progress for guild projects in GNEW.
 */
type Task = { id: string; projectId: string; title: string; status: "todo"|"in-progress"|"done"; assignee?: string; createdAt: number };
const tasks: Task[] = [];

const TaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  status: z.enum(["todo","in-progress","done"]),
  assignee: z.string().optional()
});

// Create a task
app.post("/api/project-tracking/task", (req,res) => {
  const parsed = TaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const record: Task = { ...parsed.data, createdAt: Date.now() };
  tasks.push(record);
  log.info({ record }, "Task created");
  res.status(201).json(record);
});

// List tasks by project
app.get("/api/project-tracking/:projectId", (req,res) => {
  const { projectId } = req.params;
  res.json(tasks.filter(t => t.projectId===projectId));
});

// Update task status
app.patch("/api/project-tracking/:taskId/status", (req,res) => {
  const { taskId } = req.params;
  const { status } = req.body;
  const task = tasks.find(t => t.id===taskId);
  if (!task) return res.status(404).json({ error: "Not found" });
  if (!["todo","in-progress","done"].includes(status)) return res.status(400).json({ error: "Invalid status" });
  task.status = status;
  res.json(task);
});

const port = Number(process.env.PORT ?? 9200);
app.listen(port, () => log.info({ port }, "Project Tracking service running"));


