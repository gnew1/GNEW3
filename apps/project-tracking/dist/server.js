"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const zod_1 = require("zod");
const log = (0, pino_1.default)();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const tasks = [];
const TaskSchema = zod_1.z.object({
    id: zod_1.z.string(),
    projectId: zod_1.z.string(),
    title: zod_1.z.string(),
    status: zod_1.z.enum(["todo", "in-progress", "done"]),
    assignee: zod_1.z.string().optional()
});
// Create a task
app.post("/api/project-tracking/task", (req, res) => {
    const parsed = TaskSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const record = { ...parsed.data, createdAt: Date.now() };
    tasks.push(record);
    log.info({ record }, "Task created");
    res.status(201).json(record);
});
// List tasks by project
app.get("/api/project-tracking/:projectId", (req, res) => {
    const { projectId } = req.params;
    res.json(tasks.filter(t => t.projectId === projectId));
});
// Update task status
app.patch("/api/project-tracking/:taskId/status", (req, res) => {
    const { taskId } = req.params;
    const { status } = req.body;
    const task = tasks.find(t => t.id === taskId);
    if (!task)
        return res.status(404).json({ error: "Not found" });
    if (!["todo", "in-progress", "done"].includes(status))
        return res.status(400).json({ error: "Invalid status" });
    task.status = status;
    res.json(task);
});
const port = Number(process.env.PORT ?? 9200);
app.listen(port, () => log.info({ port }, "Project Tracking service running"));
