
#!/usr/bin/env node
import express from "express";
import { cfg } from "./config.js";
import "./db.js";
import { assess } from "./routes/assess.js";
import { ingest } from "./routes/ingest.js";
import { wallets } from "./routes/wallets.js";
import { lists } from "./routes/lists.js";
import { revocations } from "./routes/revocations.js";
import { policy } from "./routes/policy.js";
import { exp } from "./routes/export.js";
import { auditRoute } from "./routes/audit.js";

const app = express();
app.use(express.json({ limit: "512kb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/assess", assess);
app.use("/ingest", ingest);
app.use("/wallets", wallets);
app.use("/lists", lists);
app.use("/revocations", revocations);
app.use("/policy", policy);
app.use("/export", exp);
app.use("/audit", auditRoute);

app.listen(cfg.port, () => console.log(`wallet-auditor listening on :${cfg.port}`));


