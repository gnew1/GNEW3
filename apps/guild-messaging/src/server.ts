
import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

type Message = { guildId: string; sender: string; content: string; timestamp: number };
const MessageSchema = z.object({
  guildId: z.string(),
  sender: z.string(),
  content: z.string()
});

const messages: Message[] = [];

wss.on("connection", ws => {
  ws.on("message", raw => {
    try {
      const parsed = MessageSchema.parse(JSON.parse(raw.toString()));
      const msg: Message = { ...parsed, timestamp: Date.now() };
      messages.push(msg);
      log.info({ msg }, "New message");
      // broadcast
      wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(JSON.stringify(msg));
      });
    } catch (err) {
      log.error({ err }, "Invalid message");
    }
  });
});

// REST endpoint to get history
app.get("/api/messages/:guildId", (req,res) => {
  const { guildId } = req.params;
  res.json(messages.filter(m => m.guildId === guildId));
});

const port = Number(process.env.PORT ?? 9160);
server.listen(port, () => log.info({ port }, "Guild Messaging service running"));


