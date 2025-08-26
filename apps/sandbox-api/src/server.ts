
import express from "express";
import cors from "cors";
import pino from "pino";

const app: import("express").Express = express();
const log = pino({ level: process.env.LOG_LEVEL ?? "info" });
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.post("/echo", (req, res) => res.json({ echo: req.body?.msg ?? "pong" }));

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => log.info({ port }, "sandbox api up"));


