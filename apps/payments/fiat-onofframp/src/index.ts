
#!/usr/bin/env node
import express from "express";
import { cfg } from "./config.js";
import "./db.js";
import { quotes } from "./routes/quotes.js";
import { orders } from "./routes/orders.js";
import { webhooks } from "./routes/webhooks.js";
import { audit } from "./routes/audit.js";
import { kyc } from "./routes/kyc.js";
import { limitByIp, limitByWallet } from "./ratelimit.js";

// Body parser que guarda el raw body para firma HMAC
const app = express();
app.use((req, res, next) => {
  let data = "";
  req.setEncoding("utf8");
  req.on("data", chunk => data += chunk);
  req.on("end", () => {
    (req as any).rawBody = data;
    try { req.body = data ? JSON.parse(data) : {}; } catch { req.body = {}; }
    next();
  });
});

app.use(limitByIp);
app.use(limitByWallet);

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/quotes", quotes);
app.use("/orders", orders);
app.use("/webhooks", webhooks);
app.use("/audit", audit);
app.use("/kyc", kyc);

app.listen(cfg.port, () => {
  console.log(`fiat-onofframp listening on :${cfg.port}`);
});


