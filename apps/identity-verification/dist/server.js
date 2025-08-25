"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const log = (0, pino_1.default)();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const verifications = [];
const InitSchema = zod_1.z.object({ userId: zod_1.z.string() });
const VerifySchema = zod_1.z.object({ userId: zod_1.z.string(), token: zod_1.z.string() });
// Initialize 2FA
app.post("/api/verify/init", async (req, res) => {
    const parsed = InitSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const secret = speakeasy_1.default.generateSecret({ length: 20 });
    const record = { id: (0, uuid_1.v4)(), userId: parsed.data.userId, secret: secret.base32, verified: false };
    verifications.push(record);
    const qr = await qrcode_1.default.toDataURL(secret.otpauth_url ?? "");
    res.json({ secret: secret.base32, qr });
});
// Verify 2FA
app.post("/api/verify/check", (req, res) => {
    const parsed = VerifySchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const record = verifications.find(v => v.userId === parsed.data.userId);
    if (!record)
        return res.status(404).json({ error: "User not found" });
    const ok = speakeasy_1.default.totp.verify({
        secret: record.secret,
        encoding: "base32",
        token: parsed.data.token
    });
    if (ok) {
        record.verified = true;
        return res.json({ verified: true });
    }
    else {
        return res.status(401).json({ verified: false });
    }
});
// Check verification status
app.get("/api/verify/status/:userId", (req, res) => {
    const record = verifications.find(v => v.userId === req.params.userId);
    if (!record)
        return res.status(404).json({ error: "User not found" });
    res.json({ verified: record.verified });
});
const port = Number(process.env.PORT ?? 9270);
app.listen(port, () => log.info({ port }, "Identity Verification service running"));
