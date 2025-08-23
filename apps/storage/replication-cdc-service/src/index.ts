
#!/usr/bin/env node
import express from "express";
import "./db.js";
import { cfg } from "./config.js";
import { events } from "./routes/events.js";
import { replay } from "./routes/replay.js";
import { backfill } from "./routes/backfill.js";
import { metrics } from "./routes/metrics.js";

const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/events", events);
app.use("/replay", replay);
app.use("/backfill", backfill);
app.use("/metrics", metrics);

app.listen(cfg.port, () => console.log(`replication-cdc-service listening on :${cfg.port}`));


