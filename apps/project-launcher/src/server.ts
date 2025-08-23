
import express from "express";
import pino from "pino";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const log = pino();
const app = express();
app.use(express.json());

type Project = {
  id: string;
  guildId: string;
  name: string;
  description: string;
  creator: string;
  status: "draft" | "launched" | "completed";
  createdAt: number;
};

const projects: Record<string, Project> = {};

const ProjectSchema = z.object({
  guildId: z.string(),
  name: z.string(),
  description: z.string(),
  creator: z.string()
});

// Launch project
app.post("/api/projects", (req,res) => {
  const parsed = ProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const id = uuidv4();
  const project: Project = { ...parsed.data, id, status:"launched", createdAt:Date.now() };
  projects[id] = project;
  log.info({ project }, "Project launched");
  res.status(201).json(project);
});

// Get project
app.get("/api/projects/:id", (req,res) => {
  const project = projects[req.params.id];
  if (!project) return res.status(404).json({ error: "Not found" });
  res.json(project);
});

// List by guild
app.get("/api/projects/guild/:guildId", (req,res) => {
  res.json(Object.values(projects).filter(p => p.guildId===req.params.guildId));
});

// Complete project
app.post("/api/projects/:id/complete", (req,res) => {
  const project = projects[req.params.id];
  if (!project) return res.status(404).json({ error:"Not found" });
  project.status = "completed";
  res.json(project);
});

const port = Number(process.env.PORT ?? 9190);
app.listen(port, () => log.info({ port }, "Project Launcher service running"));


