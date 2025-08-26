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
const rewards = [];
const RewardSchema = zod_1.z.object({
    projectId: zod_1.z.string(),
    userId: zod_1.z.string(),
    token: zod_1.z.enum(["Gnew0", "Gnews"]),
    amount: zod_1.z.number().positive(),
    reason: zod_1.z.string()
});
// Create reward
app.post("/api/project-rewarding", (req, res) => {
    const parsed = RewardSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const reward = { id: (0, uuid_1.v4)(), ...parsed.data, createdAt: Date.now() };
    rewards.push(reward);
    log.info({ reward }, "Reward assigned");
    res.status(201).json(reward);
});
// List rewards by project
app.get("/api/project-rewarding/project/:projectId", (req, res) => {
    res.json(rewards.filter(r => r.projectId === req.params.projectId));
});
// List rewards by user
app.get("/api/project-rewarding/user/:userId", (req, res) => {
    res.json(rewards.filter(r => r.userId === req.params.userId));
});
const port = Number(process.env.PORT ?? 9220);
app.listen(port, () => log.info({ port }, "Project Rewarding service running"));
