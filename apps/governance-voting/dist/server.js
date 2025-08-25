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
const proposals = {};
const ProposalSchema = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    createdBy: zod_1.z.string()
});
const VoteSchema = zod_1.z.object({
    voter: zod_1.z.string(),
    choice: zod_1.z.enum(["yes", "no", "abstain"])
});
// Create proposal
app.post("/api/voting/proposals", (req, res) => {
    const parsed = ProposalSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const id = (0, uuid_1.v4)();
    proposals[id] = { ...parsed.data, id, createdAt: Date.now(), votes: {} };
    log.info({ proposal: proposals[id] }, "Proposal created");
    res.status(201).json(proposals[id]);
});
// List proposals
app.get("/api/voting/proposals", (_req, res) => {
    res.json(Object.values(proposals));
});
// Vote on proposal
app.post("/api/voting/proposals/:id/vote", (req, res) => {
    const { id } = req.params;
    const parsed = VoteSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const proposal = proposals[id];
    if (!proposal)
        return res.status(404).json({ error: "Not found" });
    proposal.votes[parsed.data.voter] = parsed.data.choice;
    log.info({ id, voter: parsed.data.voter, choice: parsed.data.choice }, "Vote recorded");
    res.json(proposal);
});
// Tally proposal
app.get("/api/voting/proposals/:id/tally", (req, res) => {
    const { id } = req.params;
    const proposal = proposals[id];
    if (!proposal)
        return res.status(404).json({ error: "Not found" });
    const tally = { yes: 0, no: 0, abstain: 0 };
    for (const c of Object.values(proposal.votes))
        tally[c]++;
    res.json({ proposalId: id, tally });
});
const port = Number(process.env.PORT ?? 9210);
app.listen(port, () => log.info({ port }, "Governance Voting service running"));
