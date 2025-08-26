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
const kpis = [];
const KPISchema = zod_1.z.object({
    id: zod_1.z.string(),
    guildId: zod_1.z.string(),
    metric: zod_1.z.string(),
    value: zod_1.z.number()
});
// Record KPI
app.post("/api/kpis", (req, res) => {
    const parsed = KPISchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const kpi = { ...parsed.data, timestamp: Date.now() };
    kpis.push(kpi);
    log.info({ kpi }, "KPI recorded");
    res.status(201).json(kpi);
});
// List KPIs per guild
app.get("/api/kpis/:guildId", (req, res) => {
    const { guildId } = req.params;
    res.json(kpis.filter(k => k.guildId === guildId));
});
// Aggregate KPI per guild
app.get("/api/kpis/:guildId/aggregate", (req, res) => {
    const { guildId } = req.params;
    const subset = kpis.filter(k => k.guildId === guildId);
    const agg = {};
    for (const k of subset) {
        if (!agg[k.metric])
            agg[k.metric] = { count: 0, avg: 0 };
        const a = agg[k.metric];
        a.count++;
        a.avg = a.avg + (k.value - a.avg) / a.count;
    }
    res.json(agg);
});
// Healthcheck
app.get("/healthz", (_req, res) => res.json({ ok: true }));
if (require.main === module) {
    const port = Number(process.env.PORT || 4010);
    app.listen(port, () => log.info({ port }, "guild-kpi-tracker up"));
}
exports.default = app;
