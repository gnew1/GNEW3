
#!/usr/bin/env node
import express from "express";
import { z } from "zod";
import { db } from "./db.js";
import { audit } from "./audit.js";
import { nanoid } from "nanoid";

const app = express();
app.use(express.json());

app.post("/plans", (req, res) => {
  const P = z.object({
    token: z.string().min(4),
    amount: z.number().int().positive(),
    periodSeconds: z.number().int().min(3600),
    anchorTimestamp: z.number().int().nonnegative(),
    graceSeconds: z.number().int().min(0).max(30 * 24 * 3600)
  });
  const p = P.parse(req.body);
  const id = nanoid();
  db.prepare("INSERT INTO plans(id,token,amount,periodSeconds,anchorTimestamp,graceSeconds,createdAt) VALUES(?,?,?,?,?,?,?)")
    .run(id, p.token, p.amount, p.periodSeconds, p.anchorTimestamp, p.graceSeconds, Date.now());
  audit(id, "PLAN_CREATED", p);
  res.json({ id, ...p });
});

app.post("/subscriptions", (req, res) => {
  const S = z.object({
    planId: z.string().min(6),
    subscriber: z.string().min(6),
    prorateFirst: z.boolean().default(false),
    startAt: z.number().int().optional()
  });
  const s = S.parse(req.body);
  const plan = db.prepare("SELECT * FROM plans WHERE id=?").get(s.planId);
  if (!plan) return res.status(404).json({ error: "plan_not_found" });
  const now = s.startAt ?? Date.now();
  const id = nanoid();
  let nextChargeAt = now;
  if (s.prorateFirst && plan.anchorTimestamp) {
    // primer cargo prorrateado ejecutado por el scheduler inmediatamente
    nextChargeAt = now; // due now
  }
  const graceEndsAt = nextChargeAt + plan.graceSeconds * 1000;
  db.prepare("INSERT INTO subscriptions(id,planId,subscriber,prorateFirst,status,startAt,nextChargeAt,graceEndsAt,createdAt) VALUES(?,?,?,?,?,?,?,?,?)")
    .run(id, s.planId, s.subscriber, s.prorateFirst ? 1 : 0, "active", now, nextChargeAt, graceEndsAt, Date.now());
  audit(id, "SUB_CREATED", s);
  res.json({ id, nextChargeAt, graceEndsAt });
});

app.post("/subscriptions/:id/cancel", (req, res) => {
  const id = String(req.params.id);
  db.prepare("UPDATE subscriptions SET status='canceled' WHERE id=?").run(id);
  audit(id, "SUB_CANCELED", {});
  res.json({ ok: true });
});

app.get("/subscriptions/due", (_req, res) => {
  const now = Date.now();
  const rows = db.prepare(`
    SELECT s.*, p.token, p.amount, p.periodSeconds, p.anchorTimestamp, p.graceSeconds
    FROM subscriptions s JOIN plans p ON p.id = s.planId
    WHERE s.status='active' AND s.nextChargeAt <= ? AND s.graceEndsAt >= ?
  `).all(now, now);
  res.json({ due: rows });
});

app.get("/audit/:scopeId", (req, res) => {
  const rows = db.prepare("SELECT * FROM audit WHERE scopeId=? ORDER BY ts ASC").all(req.params.scopeId);
  res.json(rows);
});

const PORT = Number(process.env.PORT ?? 8082);
app.listen(PORT, () => console.log(`subscriptions-api listening on :${PORT}`));


