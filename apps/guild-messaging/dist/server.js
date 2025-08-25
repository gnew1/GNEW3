"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const http_1 = __importDefault(require("http"));
const pino_1 = __importDefault(require("pino"));
const zod_1 = require("zod");
const log = (0, pino_1.default)();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
const MessageSchema = zod_1.z.object({
    guildId: zod_1.z.string(),
    sender: zod_1.z.string(),
    content: zod_1.z.string()
});
const messages = [];
wss.on("connection", ws => {
    ws.on("message", raw => {
        try {
            const parsed = MessageSchema.parse(JSON.parse(raw.toString()));
            const msg = { ...parsed, timestamp: Date.now() };
            messages.push(msg);
            log.info({ msg }, "New message");
            // broadcast
            wss.clients.forEach(client => {
                if (client.readyState === 1)
                    client.send(JSON.stringify(msg));
            });
        }
        catch (err) {
            log.error({ err }, "Invalid message");
        }
    });
});
// REST endpoint to get history
app.get("/api/messages/:guildId", (req, res) => {
    const { guildId } = req.params;
    res.json(messages.filter(m => m.guildId === guildId));
});
const port = Number(process.env.PORT ?? 9160);
server.listen(port, () => log.info({ port }, "Guild Messaging service running"));
