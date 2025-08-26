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
const reviews = [];
const ReviewSchema = zod_1.z.object({
    id: zod_1.z.string(),
    guildId: zod_1.z.string(),
    reviewer: zod_1.z.string(),
    reviewee: zod_1.z.string(),
    score: zod_1.z.number().min(1).max(5),
    feedback: zod_1.z.string()
});
// Submit review
app.post("/api/reviews", (req, res) => {
    const parsed = ReviewSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const review = { ...parsed.data, timestamp: Date.now() };
    reviews.push(review);
    log.info({ review }, "Review recorded");
    res.status(201).json(review);
});
// List reviews
app.get("/api/reviews/:guildId", (req, res) => {
    const { guildId } = req.params;
    res.json(reviews.filter(r => r.guildId === guildId));
});
// Aggregate review scores
app.get("/api/reviews/:guildId/aggregate", (req, res) => {
    const { guildId } = req.params;
    const subset = reviews.filter(r => r.guildId === guildId);
    const agg = {};
    for (const r of subset) {
        if (!agg[r.reviewee])
            agg[r.reviewee] = { count: 0, avg: 0 };
        agg[r.reviewee].count++;
        agg[r.reviewee].avg = ((agg[r.reviewee].avg * (agg[r.reviewee].count - 1)) + r.score) / agg[r.reviewee].count;
    }
    res.json(agg);
});
const port = Number(process.env.PORT ?? 9130);
app.listen(port, () => log.info({ port }, "Productivity Reviewer service up"));
