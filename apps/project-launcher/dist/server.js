"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const log = (0, pino_1.default)();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const projects = {};
const ProjectSchema = zod_1.z.object({
    guildId: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    creator: zod_1.z.string()
});
// Launch project
app.post("/api/projects", (req, res) => {
    const parsed = ProjectSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const id = (0, uuid_1.v4)();
    const project = { ...parsed.data, id, status: "launched", createdAt: Date.now() };
    projects[id] = project;
    log.info({ project }, "Project launched");
    res.status(201).json(project);
});
// Get project
app.get("/api/projects/:id", (req, res) => {
    const project = projects[req.params.id];
    if (!project)
        return res.status(404).json({ error: "Not found" });
    res.json(project);
});
// List by guild
app.get("/api/projects/guild/:guildId", (req, res) => {
    res.json(Object.values(projects).filter(p => p.guildId === req.params.guildId));
});
// Complete project
app.post("/api/projects/:id/complete", (req, res) => {
    const project = projects[req.params.id];
    if (!project)
        return res.status(404).json({ error: "Not found" });
    project.status = "completed";
    res.json(project);
});
const port = Number(process.env.PORT ?? 9190);
app.listen(port, () => log.info({ port }, "Project Launcher service running"));
