
#!/usr/bin/env node
import express from "express";
import "./db.js";
import { cfg } from "./config.js";
import { datasets } from "./routes/datasets.js";
import { jobs } from "./routes/jobs.js";
import { lineage } from "./routes/lineage.js";
import { quality } from "./routes/quality.js";

const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/", datasets);
app.use("/", jobs);
app.use("/", lineage);
app.use("/", quality);

app.listen(cfg.port, () => {
  console.log(`lineage-tracker listening on :${cfg.port}`);
});


