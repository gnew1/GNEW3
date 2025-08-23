
#!/usr/bin/env node
import express from "express";
import { cfg } from "./config.js";
import { limitByIp, limitByWallet } from "./ratelimit.js";
import { guardians } from "./routes/guardians.js";
import { recovery } from "./routes/recovery.js";
import { audit } from "./routes/audit.js";
import "./db.js";

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use(limitByIp);
app.use(limitByWallet);

app.use("/guardians", guardians);
app.use("/recovery", recovery);
app.use("/audit", audit);

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(cfg.port, () => {
  console.log(`wallet-recovery-service listening on :${cfg.port}`);
});


