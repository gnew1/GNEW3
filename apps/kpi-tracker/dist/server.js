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
const KPISchema = zod_1.z.object({
    guildId: zod_1.z.string(),
    metric: zod_1.z.string(),
    value: zod_1.z.number(),
    timestamp: zod_1.z.number().optional()
});
const kpis = [];
// Submit KPI
app.post("/api/kpis", (req, res) => {
    const parsed = KPISchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const record = {
        ...parsed.data,
        timestamp: parsed.data.timestamp ?? Date.now()
    };
    kpis.push(record);
    log.info({ record }, "KPI recorded");
    res.status(201).json(record);
});
// List KPIs
app.get("/api/kpis", (_req, res) => {
    res.json(kpis);
});
// KPIs by guild
app.get("/api/kpis/:guildId", (req, res) => {
    const { guildId } = req.params;
    res.json(kpis.filter(k => k.guildId === guildId));
});
const port = Number(process.env.PORT ?? 9120);
app.listen(port, () => log.info({ port }, "KPI Tracker service up"));
