
#!/usr/bin/env node
import express from "express";
import { cfg } from "./config.js";
import "./db.js";
import { events } from "./routes/events.js";
import { datasets } from "./routes/datasets.js";
import { graph } from "./routes/graph.js";
import { jobs } from "./routes/jobs.js";
import { openlineage } from "./routes/openlineage.js";
import { auditRoute } from "./routes/audit.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/events", events);
app.use("/datasets", datasets);
app.use("/graph", graph);
app.use("/jobs", jobs);
app.use("/openlineage", openlineage);
app.use("/audit", auditRoute);

app.listen(cfg.port, () => console.log(`lineage-service listening on :${cfg.port}`));


