
#!/usr/bin/env node
import express from "express";
import "./db.js";
import { cfg } from "./config.js";
import { rules } from "./routes/rules.js";
import { run } from "./routes/run.js";

const app = express();
app.use(express.json({ limit: "8mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/", rules);
app.use("/", run);

app.listen(cfg.port, () => {
  console.log(`data-quality-runner listening on :${cfg.port}`);
});


