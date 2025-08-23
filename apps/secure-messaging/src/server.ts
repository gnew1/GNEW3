
import express from "express";
import pino from "pino";
import { z } from "zod";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
import { v4 as uuidv4 } from "uuid";

const log = pino();
const app = express();
app.use(express.json());

/**
 * Secure Messaging Service
 * Provides encrypted messaging between members with public/private key pairs.
 */
type UserKey = { userId:string, publicKey:string, secretKey:string };
type Message = { id:string, from:string, to:string, ciphertext:string, createdAt:number };

const users: Record<string, UserKey> = {};
const messages: Message[] = [];

app.post("/api/secure/register/:userId", (req,res) => {
  const { userId } = req.params;
  const kp = nacl.box.keyPair();
  const uk: UserKey = {
    userId,
    publicKey: naclUtil.encodeBase64(kp.publicKey),
    secretKey: naclUtil.encodeBase64(kp.secretKey)
  };
  users[userId] = uk;
  log.info({ userId }, "User registered with keypair");
  res.json({ userId, publicKey: uk.publicKey });
});

const SendSchema = z.object({
  from: z.string(),
  to: z.string(),
  message: z.string()
});

app.post("/api/secure/send", (req,res) => {
  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const { from,to,message } = parsed.data;
  if (!users[from] || !users[to]) return res.status(404).json({ error:"User not found" });
  const nonce = nacl.randomBytes(24);
  const cipher = nacl.box(
    naclUtil.decodeUTF8(message),
    nonce,
    naclUtil.decodeBase64(users[to].publicKey),
    naclUtil.decodeBase64(users[from].secretKey)
  );
  const payload = {
    nonce: naclUtil.encodeBase64(nonce),
    cipher: naclUtil.encodeBase64(cipher)
  };
  const msg: Message = { id: uuidv4(), from, to, ciphertext: JSON.stringify(payload), createdAt: Date.now() };
  messages.push(msg);
  res.status(201).json({ id: msg.id });
});

app.get("/api/secure/inbox/:userId", (req,res) => {
  const { userId } = req.params;
  const inbox = messages.filter(m => m.to===userId);
  res.json(inbox);
});

const port = Number(process.env.PORT ?? 9240);
app.listen(port, () => log.info({ port }, "Secure Messaging service running"));


