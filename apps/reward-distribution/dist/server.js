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
const rewards = [];
const RewardSchema = zod_1.z.object({
    id: zod_1.z.string(),
    guildId: zod_1.z.string(),
    memberId: zod_1.z.string(),
    token: zod_1.z.string(),
    amount: zod_1.z.number().positive()
});
// Distribute reward
app.post("/api/rewards", (req, res) => {
    const parsed = RewardSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const reward = { ...parsed.data, timestamp: Date.now() };
    rewards.push(reward);
    log.info({ reward }, "Reward distributed");
    res.status(201).json(reward);
});
// List rewards for guild
app.get("/api/rewards/:guildId", (req, res) => {
    const { guildId } = req.params;
    res.json(rewards.filter(r => r.guildId === guildId));
});
// Member rewards
app.get("/api/rewards/:guildId/:memberId", (req, res) => {
    const { guildId, memberId } = req.params;
    res.json(rewards.filter(r => r.guildId === guildId && r.memberId === memberId));
});
const port = Number(process.env.PORT ?? 9150);
app.listen(port, () => log.info({ port }, "Reward Distribution service up"));
