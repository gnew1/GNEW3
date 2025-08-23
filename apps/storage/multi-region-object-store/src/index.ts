
#!/usr/bin/env node
import express from "express";
import "./db.js";
import { cfg } from "./config.js";
import { objects } from "./routes/objects.js";
import { admin } from "./routes/admin.js";
import { tickHealth } from "./state.js";

const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/healthz", async (_req, res) => {
  await tickHealth(cfg.failoverMode === "auto");
  res.json({ ok: true });
});

app.use("/objects", objects);
app.use("/admin", admin);

const server = app.listen(cfg.port, () => console.log(`multi-region-object-store listening on :${cfg.port}`));

// background health ticker
setInterval(() => tickHealth(cfg.failoverMode === "auto").catch(() => {}), 15000);

// graceful
process.on("SIGTERM", () => server.close());


