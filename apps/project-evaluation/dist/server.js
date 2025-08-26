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
const evaluations = [];
const EvalSchema = zod_1.z.object({
    projectId: zod_1.z.string(),
    evaluator: zod_1.z.string(),
    score: zod_1.z.number().min(0).max(10),
    comment: zod_1.z.string().optional()
});
// Submit evaluation
app.post("/api/project-evaluation", (req, res) => {
    const parsed = EvalSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const evalRecord = { id: (0, uuid_1.v4)(), ...parsed.data, createdAt: Date.now() };
    evaluations.push(evalRecord);
    log.info({ evalRecord }, "Project evaluation submitted");
    res.status(201).json(evalRecord);
});
// List evaluations by project
app.get("/api/project-evaluation/:projectId", (req, res) => {
    const { projectId } = req.params;
    res.json(evaluations.filter(e => e.projectId === projectId));
});
// Aggregate score
app.get("/api/project-evaluation/:projectId/aggregate", (req, res) => {
    const { projectId } = req.params;
    const subset = evaluations.filter(e => e.projectId === projectId);
    if (subset.length === 0)
        return res.json({ avg: 0, count: 0 });
    const avg = subset.reduce((a, b) => a + b.score, 0) / subset.length;
    res.json({ avg, count: subset.length });
});
const port = Number(process.env.PORT ?? 9210);
app.listen(port, () => log.info({ port }, "Project Evaluation service running"));
