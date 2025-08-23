
#!/usr/bin/env node
import express from "express";
import "./db.js";
import { cfg } from "./config.js";
import { disputes } from "./routes/disputes.js";
import { holds } from "./routes/holds.js";
import { adjustments } from "./routes/adjustments.js";
import { auditRoute } from "./routes/audit.js";

const app = express();
app.use(express.json({ limit: "512kb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/disputes", disputes);
app.use("/holds", holds);
app.use("/adjustments", adjustments);
app.use("/audit", auditRoute);

app.listen(cfg.port, () => console.log(`disputes-service listening on :${cfg.port}`));


