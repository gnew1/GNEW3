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
const votes = [];
const VoteSchema = zod_1.z.object({
    proposalId: zod_1.z.string(),
    guildId: zod_1.z.string(),
    memberId: zod_1.z.string(),
    option: zod_1.z.string()
});
// Record a vote (analytics only, not governance logic)
app.post("/api/voting-analytics/vote", (req, res) => {
    const parsed = VoteSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const rec = { ...parsed.data, timestamp: Date.now() };
    votes.push(rec);
    log.info({ rec }, "Vote recorded in analytics");
    res.status(201).json(rec);
});
// Analytics by guild
app.get("/api/voting-analytics/:guildId", (req, res) => {
    const { guildId } = req.params;
    const subset = votes.filter(v => v.guildId === guildId);
    const tally = {};
    for (const v of subset)
        tally[v.option] = (tally[v.option] || 0) + 1;
    res.json({ guildId, total: subset.length, distribution: tally });
});
// Analytics by proposal
app.get("/api/voting-analytics/proposal/:proposalId", (req, res) => {
    const { proposalId } = req.params;
    const subset = votes.filter(v => v.proposalId === proposalId);
    const tally = {};
    for (const v of subset)
        tally[v.option] = (tally[v.option] || 0) + 1;
    res.json({ proposalId, total: subset.length, distribution: tally });
});
const port = Number(process.env.PORT ?? 9170);
app.listen(port, () => log.info({ port }, "Voting Analytics service running"));
