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
const reputations = {};
const ReputationEventSchema = zod_1.z.object({
    guildId: zod_1.z.string(),
    memberId: zod_1.z.string(),
    delta: zod_1.z.number()
});
// Add or subtract reputation
app.post("/api/reputation/update", (req, res) => {
    const parsed = ReputationEventSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const { guildId, memberId, delta } = parsed.data;
    const key = `${guildId}:${memberId}`;
    if (!reputations[key])
        reputations[key] = { guildId, memberId, points: 0 };
    reputations[key].points += delta;
    log.info({ guildId, memberId, delta }, "Reputation updated");
    res.json(reputations[key]);
});
// Get member reputation
app.get("/api/reputation/:guildId/:memberId", (req, res) => {
    const { guildId, memberId } = req.params;
    const key = `${guildId}:${memberId}`;
    res.json(reputations[key] ?? { guildId, memberId, points: 0 });
});
// Leaderboard by guild
app.get("/api/reputation/:guildId", (req, res) => {
    const { guildId } = req.params;
    const list = Object.values(reputations)
        .filter(r => r.guildId === guildId)
        .sort((a, b) => b.points - a.points);
    res.json(list);
});
const port = Number(process.env.PORT ?? 9180);
app.listen(port, () => log.info({ port }, "Reputation System service running"));
