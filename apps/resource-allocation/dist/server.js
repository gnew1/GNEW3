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
const allocations = [];
const AllocationSchema = zod_1.z.object({
    projectId: zod_1.z.string(),
    guildId: zod_1.z.string(),
    resource: zod_1.z.string(),
    amount: zod_1.z.number().positive()
});
// Create allocation
app.post("/api/resource-allocation", (req, res) => {
    const parsed = AllocationSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const record = { ...parsed.data, timestamp: Date.now() };
    allocations.push(record);
    log.info({ record }, "Resource allocated");
    res.status(201).json(record);
});
// Get allocations by guild
app.get("/api/resource-allocation/:guildId", (req, res) => {
    const { guildId } = req.params;
    res.json(allocations.filter(a => a.guildId === guildId));
});
// Get allocations by project
app.get("/api/resource-allocation/project/:projectId", (req, res) => {
    const { projectId } = req.params;
    res.json(allocations.filter(a => a.projectId === projectId));
});
const port = Number(process.env.PORT ?? 9190);
app.listen(port, () => log.info({ port }, "Resource Allocation service running"));
