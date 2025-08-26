"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const zod_1 = require("zod");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const uuid_1 = require("uuid");
// Minimal helpers to replace tweetnacl-util
const b64enc = (u8) => Buffer.from(u8).toString("base64");
const b64dec = (s) => new Uint8Array(Buffer.from(s, "base64"));
const utf8enc = (s) => new Uint8Array(Buffer.from(s, "utf8"));
const log = (0, pino_1.default)();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const users = {};
const messages = [];
app.post("/api/secure/register/:userId", (req, res) => {
    const { userId } = req.params;
    const kp = tweetnacl_1.default.box.keyPair();
    const uk = {
        userId,
        publicKey: b64enc(kp.publicKey),
        secretKey: b64enc(kp.secretKey)
    };
    users[userId] = uk;
    log.info({ userId }, "User registered with keypair");
    res.json({ userId, publicKey: uk.publicKey });
});
const SendSchema = zod_1.z.object({
    from: zod_1.z.string(),
    to: zod_1.z.string(),
    message: zod_1.z.string()
});
app.post("/api/secure/send", (req, res) => {
    const parsed = SendSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const { from, to, message } = parsed.data;
    if (!users[from] || !users[to])
        return res.status(404).json({ error: "User not found" });
    const nonce = tweetnacl_1.default.randomBytes(24);
    const cipher = tweetnacl_1.default.box(utf8enc(message), nonce, b64dec(users[to].publicKey), b64dec(users[from].secretKey));
    const payload = {
        nonce: b64enc(nonce),
        cipher: b64enc(cipher)
    };
    const msg = { id: (0, uuid_1.v4)(), from, to, ciphertext: JSON.stringify(payload), createdAt: Date.now() };
    messages.push(msg);
    res.status(201).json({ id: msg.id });
});
app.get("/api/secure/inbox/:userId", (req, res) => {
    const { userId } = req.params;
    const inbox = messages.filter(m => m.to === userId);
    res.json(inbox);
});
const port = Number(process.env.PORT ?? 9240);
app.listen(port, () => log.info({ port }, "Secure Messaging service running"));
