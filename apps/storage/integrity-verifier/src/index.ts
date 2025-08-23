
#!/usr/bin/env node
import express from "express";
import { cfg } from "./config.js";
import "./db.js";
import { verifyRoute } from "./routes/verify.js";
import { auditRoute } from "./routes/audit.js";

const app = express();
app.use(express.json({ limit: "50mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.use("/verify", verifyRoute);
app.use("/audit", auditRoute);

app.listen(cfg.port, () => console.log(`integrity-verifier listening on :${cfg.port}`));


