
import express from "express";
import pino from "pino";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

const log = pino();
const app = express();
app.use(express.json());

/**
 * Identity Verification Service
 * Provides secure 2FA and KYC stubs for GNEW users.
 */
type UserVerification = {
  id: string;
  userId: string;
  secret: string;
  verified: boolean;
};

const verifications: UserVerification[] = [];

const InitSchema = z.object({ userId: z.string() });
const VerifySchema = z.object({ userId: z.string(), token: z.string() });

// Initialize 2FA
app.post("/api/verify/init", async (req,res) => {
  const parsed = InitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const secret = speakeasy.generateSecret({ length: 20 });
  const record: UserVerification = { id: uuidv4(), userId: parsed.data.userId, secret: secret.base32, verified: false };
  verifications.push(record);

  const qr = await QRCode.toDataURL(secret.otpauth_url ?? "");
  res.json({ secret: secret.base32, qr });
});

// Verify 2FA
app.post("/api/verify/check", (req,res) => {
  const parsed = VerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const record = verifications.find(v => v.userId === parsed.data.userId);
  if (!record) return res.status(404).json({ error: "User not found" });

  const ok = speakeasy.totp.verify({
    secret: record.secret,
    encoding: "base32",
    token: parsed.data.token
  });

  if (ok) {
    record.verified = true;
    return res.json({ verified: true });
  } else {
    return res.status(401).json({ verified: false });
  }
});

// Check verification status
app.get("/api/verify/status/:userId", (req,res) => {
  const record = verifications.find(v => v.userId === req.params.userId);
  if (!record) return res.status(404).json({ error: "User not found" });
  res.json({ verified: record.verified });
});

const port = Number(process.env.PORT ?? 9270);
app.listen(port, () => log.info({ port }, "Identity Verification service running"));


