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
const proposals = {};
const ProposalSchema = zod_1.z.object({
    id: zod_1.z.string(),
    guildId: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    options: zod_1.z.array(zod_1.z.string()).min(2)
});
// Create proposal
app.post("/api/governance/proposals", (req, res) => {
    const parsed = ProposalSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const proposal = { ...parsed.data, votes: {}, createdAt: Date.now() };
    proposals[proposal.id] = proposal;
    log.info({ proposal }, "Governance proposal created");
    res.status(201).json(proposal);
});
// List proposals
app.get("/api/governance/proposals/:guildId", (req, res) => {
    const { guildId } = req.params;
    res.json(Object.values(proposals).filter(p => p.guildId === guildId));
});
// Vote
app.post("/api/governance/proposals/:id/vote", (req, res) => {
    const { id } = req.params;
    const { memberId, option } = req.body;
    const proposal = proposals[id];
    if (!proposal)
        return res.status(404).json({ error: "Proposal not found" });
    if (!proposal.options.includes(option))
        return res.status(400).json({ error: "Invalid option" });
    proposal.votes[memberId] = option;
    log.info({ id, memberId, option }, "Vote recorded");
    res.json(proposal);
});
// Results
app.get("/api/governance/proposals/:id/results", (req, res) => {
    const { id } = req.params;
    const proposal = proposals[id];
    if (!proposal)
        return res.status(404).json({ error: "Proposal not found" });
    const tally = {};
    for (const opt of proposal.options)
        tally[opt] = 0;
    for (const v of Object.values(proposal.votes))
        tally[v]++;
    res.json({ id, title: proposal.title, results: tally });
});
const port = Number(process.env.PORT ?? 9150);
app.listen(port, () => log.info({ port }, "Guild Governance service up"));
