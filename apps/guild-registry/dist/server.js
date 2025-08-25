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
// In-memory registry
const guilds = {};
const GuildSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    specialties: zod_1.z.array(zod_1.z.string()).min(1),
    representative: zod_1.z.string().optional()
});
// Register guild
app.post("/api/guilds", (req, res) => {
    const parsed = GuildSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const guild = parsed.data;
    guilds[guild.id] = guild;
    log.info({ guild }, "Guild registered");
    res.status(201).json(guild);
});
// List guilds
app.get("/api/guilds", (_req, res) => {
    res.json(Object.values(guilds));
});
// Assign representative
app.post("/api/guilds/:id/representative", (req, res) => {
    const { id } = req.params;
    const { representative } = req.body;
    if (!guilds[id])
        return res.status(404).json({ error: "Guild not found" });
    guilds[id].representative = representative;
    log.info({ id, representative }, "Representative assigned");
    res.json(guilds[id]);
});
const port = Number(process.env.PORT ?? 9100);
app.listen(port, () => log.info({ port }, "Guild Registry service up"));
