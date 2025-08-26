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
const tasks = {};
const TaskSchema = zod_1.z.object({
    id: zod_1.z.string(),
    guildId: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string()
});
// Create task
app.post("/api/tasks", (req, res) => {
    const parsed = TaskSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const task = { ...parsed.data, assignee: null, status: "open", createdAt: Date.now() };
    tasks[task.id] = task;
    log.info({ task }, "Task created");
    res.status(201).json(task);
});
// Assign task
app.post("/api/tasks/:id/assign", (req, res) => {
    const { id } = req.params;
    const { memberId } = req.body;
    const task = tasks[id];
    if (!task)
        return res.status(404).json({ error: "Task not found" });
    task.assignee = memberId;
    task.status = "in-progress";
    res.json(task);
});
// Complete task
app.post("/api/tasks/:id/complete", (req, res) => {
    const { id } = req.params;
    const task = tasks[id];
    if (!task)
        return res.status(404).json({ error: "Task not found" });
    task.status = "done";
    res.json(task);
});
// List tasks by guild
app.get("/api/tasks/:guildId", (req, res) => {
    const { guildId } = req.params;
    res.json(Object.values(tasks).filter(t => t.guildId === guildId));
});
const port = Number(process.env.PORT ?? 9160);
app.listen(port, () => log.info({ port }, "Task Assignment service up"));
