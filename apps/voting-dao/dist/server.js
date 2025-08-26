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
const proposals = [];
const votes = [];
const ProposalSchema = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string()
});
const VoteSchema = zod_1.z.object({
    proposalId: zod_1.z.string(),
    userId: zod_1.z.string(),
    token: zod_1.z.enum(["Gnew0", "Gnews"]),
    weight: zod_1.z.number().positive()
});
// Create proposal
app.post("/api/dao/proposals", (req, res) => {
    const parsed = ProposalSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const proposal = { id: (0, uuid_1.v4)(), ...parsed.data, createdAt: Date.now() };
    proposals.push(proposal);
    res.status(201).json(proposal);
});
// List proposals
app.get("/api/dao/proposals", (_req, res) => {
    res.json(proposals);
});
// Cast vote
app.post("/api/dao/votes", (req, res) => {
    const parsed = VoteSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const vote = { id: (0, uuid_1.v4)(), ...parsed.data, createdAt: Date.now() };
    votes.push(vote);
    res.status(201).json(vote);
});
// Tally votes
// Tally votes (by proposal)
app.get("/api/dao/tally/:proposalId", (req, res) => {
    const { proposalId } = req.params;
    const related = votes.filter((v) => v.proposalId === proposalId);
    if (!related.length)
        return res.json({ proposalId, totals: { Gnew0: 0, Gnews: 0 }, votes: 0 });
    const totals = related.reduce((acc, v) => {
        acc[v.token] += v.weight;
        return acc;
    }, { Gnew0: 0, Gnews: 0 });
    res.json({ proposalId, totals, votes: related.length });
});
// Health
app.get("/healthz", (_req, res) => res.json({ ok: true }));
if (require.main === module) {
    const PORT = Number(process.env.PORT ?? 8087);
    app.listen(PORT, () => log.info({ msg: `voting-dao listening on :${PORT}` }));
}
exports.default = app;
