
#!/usr/bin/env node
import express from "express";
import { cfg } from "./config.js";
import "./db.js";
import { moderate } from "./routes/moderate.js";
import { mask } from "./routes/mask.js";
import { contents } from "./routes/contents.js";
import { queue } from "./routes/queue.js";
import { labels } from "./routes/labels.js";
import { appeals } from "./routes/appeals.js";
import { policy } from "./routes/policy.js";
import { lists } from "./routes/lists.js";
import { exp } from "./routes/export.js";
import { auditRoute } from "./routes/audit.js";

const app = express();
app.use(express.json({ limit: "512kb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/moderate", moderate);
app.use("/mask", mask);
app.use("/contents", contents);
app.use("/queue", queue);
app.use("/labels", labels);
app.use("/appeals", appeals);
app.use("/policy", policy);
app.use("/lists", lists);
app.use("/export", exp);
app.use("/audit", auditRoute);

app.listen(cfg.port, () => console.log(`moderation-service listening on :${cfg.port}`));


