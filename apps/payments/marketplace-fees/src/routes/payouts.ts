
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";
import { audit } from "../audit.js";

export const payouts = Router();

payouts.post("/prepare", (req, res) => {
  const P = z.object({
    partnerId: z.string().min(6),
    currency: z.string().min(3),
    untilDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD
  });
  const p = P.parse(req.body);

  // Sumamos partnerNetMinor de splits con order.createdAt <= until
  const until = new Date(p.untilDate + "T23:59:59Z").getTime();
  const rows = db.prepare(`
    SELECT s.orderId, s.partnerNetMinor, o.createdAt
    FROM splits s JOIN orders o ON o.id=s.orderId
    WHERE o.partnerId=? AND s.currency=? AND o.createdAt <= ?
      AND s.orderId NOT IN (SELECT orderId FROM payout_items)
  `).all(p.partnerId, p.currency, until) as any[];

  const amount = rows.reduce((a, r) => a + r.partnerNetMinor, 0);
  if (amount <= 0) return res.status(409).json({ error: "no_funds" });

  const id = nanoid();
  const now = Date.now();
  db.prepare("INSERT INTO payouts(id,partnerId,currency,amountMinor,createdAt,coveredUntil,status) VALUES(?,?,?,?,?,?,?)")
    .run(id, p.partnerId, p.currency, amount, now, until, "pending");

  const ins = db.prepare("INSERT INTO payout_items(id,payoutId,orderId,amountMinor) VALUES(?,?,?,?)");
  rows.forEach(r => ins.run(nanoid(), id, r.orderId, r.partnerNetMinor));

  // descontar del balance
  const bal = db.prepare("SELECT availableMinor FROM balances WHERE partnerId=? AND currency=?").get(p.partnerId, p.currency) as any;
  const newBal = Math.max(0, (bal?.availableMinor ?? 0) - amount);
  db.prepare("UPDATE balances SET availableMinor=?, updatedAt=? WHERE partnerId=? AND currency=?")
    .run(newBal, now, p.partnerId, p.currency);

  audit(id, "PAYOUT_PREPARED", { amountMinor: amount, count: rows.length, until });
  res.json({ id, amountMinor: amount, count: rows.length });
});

payouts.post("/:id/mark-paid", (req, res) => {
  const P = z.object({ reference: z.string().min(3) });
  const p = P.parse(req.body);
  const r = db.prepare("SELECT * FROM payouts WHERE id=?").get(req.params.id) as any;
  if (!r) return res.status(404).json({ error: "not_found" });
  if (r.status !== "pending") return res.status(409).json({ error: "invalid_status" });
  db.prepare("UPDATE payouts SET status='paid', reference=? WHERE id=?").run(p.reference, r.id);
  audit(r.id, "PAYOUT_PAID", { reference: p.reference });
  res.json({ ok: true });
});

payouts.get("/:id", (req, res) => {
  const r = db.prepare("SELECT * FROM payouts WHERE id=?").get(req.params.id) as any;
  if (!r) return res.status(404).json({ error: "not_found" });
  const items = db.prepare("SELECT orderId, amountMinor FROM payout_items WHERE payoutId=?").all(req.params.id) as any[];
  if (req.headers.accept?.includes("text/csv")) {
    const lines = ["order_id,amount_minor"];
    for (const it of items) lines.push(`${it.orderId},${it.amountMinor}`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.send(lines.join("\n"));
  }
  res.json({ payout: r, items });
});


