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
const reputation = [];
const ReputationSchema = zod_1.z.object({
    memberId: zod_1.z.string(),
    guildId: zod_1.z.string(),
    score: zod_1.z.number().min(-10).max(10),
    reason: zod_1.z.string()
});
// Add reputation
app.post("/api/reputation", (req, res) => {
    const parsed = ReputationSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const rec = { ...parsed.data, timestamp: Date.now() };
    reputation.push(rec);
    log.info({ rec }, "Reputation event recorded");
    res.status(201).json(rec);
});
// Member score
app.get("/api/reputation/:guildId/:memberId", (req, res) => {
    const { guildId, memberId } = req.params;
    const memberRecords = reputation.filter(r => r.guildId === guildId && r.memberId === memberId);
    const total = memberRecords.reduce((a, b) => a + b.score, 0);
    res.json({ guildId, memberId, total, history: memberRecords });
});
// Guild leaderboard
app.get("/api/reputation/:guildId", (req, res) => {
    const { guildId } = req.params;
    const subset = reputation.filter(r => r.guildId === guildId);
    const scores = {};
    for (const r of subset)
        scores[r.memberId] = (scores[r.memberId] || 0) + r.score;
    const leaderboard = Object.entries(scores).map(([memberId, total]) => ({ memberId, total }))
        .sort((a, b) => b.total - a.total);
    res.json(leaderboard);
});
const port = Number(process.env.PORT ?? 9140);
app.listen(port, () => log.info({ port }, "Member Reputation service up"));
