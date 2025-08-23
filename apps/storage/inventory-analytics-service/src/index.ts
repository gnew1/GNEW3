
#!/usr/bin/env node
import express from "express";
import { cfg } from "./config.js";
import "./db.js";
import { upload } from "./routes/upload.js";
import { stats } from "./routes/stats.js";
import { cost } from "./routes/cost.js";
import { advisor } from "./routes/advisor.js";

const app = express();
app.use(express.json({ limit: "16mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/inventory/upload", upload);
app.use("/", stats);
app.use("/", cost);
app.use("/", advisor);

app.listen(cfg.port, () => {
  console.log(`inventory-analytics-service listening on :${cfg.port}`);
});


