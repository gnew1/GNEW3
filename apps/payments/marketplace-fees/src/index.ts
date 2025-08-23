
#!/usr/bin/env node
import express from "express";
import { cfg } from "./config.js";
import "./db.js";
import { partners } from "./routes/partners.js";
import { feeRules } from "./routes/feeRules.js";
import { orders } from "./routes/orders.js";
import { balances } from "./routes/balances.js";
import { payouts } from "./routes/payouts.js";
import { auditRoute } from "./routes/audit.js";

const app = express();
app.use(express.json({ limit: "256kb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/partners", partners);
app.use("/fee-rules", feeRules);
app.use("/orders", orders);
app.use("/balances", balances);
app.use("/payouts", payouts);
app.use("/audit", auditRoute);

app.listen(cfg.port, () => {
  console.log(`marketplace-fees listening on :${cfg.port}`);
});


