
import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { audit } from "../audit.js";
import { nextDeadline } from "../sla.js";
import { ReasonCatalog } from "../reasonCodes.js";
import { notify } from "../notifier.js";

export const disputes = Router();

const Open = z.object({
  paymentId: z.string().min(4),
  partnerId: z.string().optional(),
  currency: z.string().min(3),
  amountMinor: z.number().int().positive(),
  feeMinor: z.number().int().nonnegative().default(0),
  network: z.string().optional(),       // visa|mc|amex...
  reasonCode: z.string().min(2),
  notes: z.string().optional()
});

disputes.post("/open", (req, res) => {
  const p = Open.parse(req.body);
  const id = nanoid();
  const now = Date.now();
  const rc = ReasonCatalog[p.reasonCode] ?? { category: "Other", description: "Unmapped reason" };
  const status = "chargeback"; // abrimos ya como chargeback (también podría existir 'inquiry')
  const respondBy = nextDeadline(status, now);

  db.prepare(`INSERT INTO disputes(id,paymentId,partnerId,currency,amountMinor,feeMinor,network,reasonCode,status,openedAt,updatedAt,respondBy,notes)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, p.paymentId, p.partnerId ?? null, p.currency, p.amountMinor, p.feeMinor, p.network ?? null, p.reasonCode, status, now, now, respondBy, p.notes ?? null);

  // crear hold
  db.prepare(`INSERT INTO holds(id,disputeId,partnerId,currency,amountMinor,createdAt) VALUES(?,?,?,?,?,?)`)
    .run(nanoid(), id, p.partnerId ?? null, p.currency, p.amountMinor, now);

  audit(id, "DISPUTE_OPENED", { ...p, status, respondBy, reason: rc });
  notify("dispute.opened", { id, paymentId: p.paymentId, amountMinor: p.amountMinor, currency: p.currency });

  res.json({ id, status, respondBy, reason: rc });
});

disputes.get("/", (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const partnerId = req.query.partnerId ? String(req.query.partnerId) : null;
  const paymentId = req.query.paymentId ? String(req.query.paymentId) : null;

  const rows = db.prepare(`
    SELECT * FROM disputes
    WHERE (? IS NULL OR status=?) AND (? IS NULL OR partnerId=?) AND (? IS NULL OR paymentId=?)
    ORDER BY openedAt DESC
  `).all(status, status, partnerId, partnerId, paymentId, paymentId) as any[];
  res.json({ disputes: rows });
});

disputes.get("/:id", (req, res) => {
  const d = db.prepare("SELECT * FROM disputes WHERE id=?").get(req.params.id) as any;
  if (!d) return res.status(404).json({ error: "not_found" });
  const ev = db.prepare("SELECT * FROM evidence WHERE disputeId=? ORDER BY createdAt ASC").all(req.params.id) as any[];
  res.json({ dispute: d, evidence: ev });
});

const Evidence = z.object({
  kind: z.enum(["receipt","shipping","communication","policy","other"]),
  url: z.string().url().optional(),
  meta: z.any()
});

disputes.post("/:id/evidence", (req, res) => {
  const d = db.prepare("SELECT * FROM disputes WHERE id=?").get(req.params.id) as any;
  if (!d) return res.status(404).json({ error: "not_found" });

  const p = Evidence.parse(req.body);
  const id = nanoid();
  db.prepare("INSERT INTO evidence(id,disputeId,kind,url,meta,createdAt) VALUES(?,?,?,?,?,?)")
    .run(id, d.id, p.kind, p.url ?? null, JSON.stringify(p.meta ?? {}), Date.now());

  audit(d.id, "EVIDENCE_ADDED", p);
  res.json({ ok: true, id });
});

disputes.post("/:id/represent", (req, res) => {
  const d = db.prepare("SELECT * FROM disputes WHERE id=?").get(req.params.id) as any;
  if (!d) return res.status(404).json({ error: "not_found" });
  if (!["chargeback","inquiry"].includes(d.status)) return res.status(409).json({ error: "invalid_state" });

  const now = Date.now();
  const next = "representment";
  const respondBy = nextDeadline(next, now);
  db.prepare("UPDATE disputes SET status=?, updatedAt=?, respondBy=? WHERE id=?")
    .run(next, now, respondBy, d.id);

  audit(d.id, "DISPUTE_REPRESENTED", { from: d.status, to: next, respondBy });
  notify("dispute.representment", { id: d.id });

  res.json({ id: d.id, status: next, respondBy });
});

disputes.post("/:id/accept", (req, res) => {
  const d = db.prepare("SELECT * FROM disputes WHERE id=?").get(req.params.id) as any;
  if (!d) return res.status(404).json({ error: "not_found" });
  if (["won","lost","accepted"].includes(d.status)) return res.status(409).json({ error: "already_closed" });

  const now = Date.now();
  db.prepare("UPDATE disputes SET status='accepted', updatedAt=? WHERE id=?").run(now, d.id);
  // cerrar hold → clawback
  closeWithAdjustment(d, "clawback");
  audit(d.id, "DISPUTE_ACCEPTED", {});
  notify("dispute.accepted", { id: d.id });

  res.json({ id: d.id, status: "accepted" });
});

const Advance = z.object({ to: z.enum(["prearbitration","arbitration"]) });
disputes.post("/:id/advance", (req, res) => {
  const d = db.prepare("SELECT * FROM disputes WHERE id=?").get(req.params.id) as any;
  if (!d) return res.status(404).json({ error: "not_found" });
  const { to } = Advance.parse(req.body);
  const allowed = (d.status === "representment" && to === "prearbitration") ||
                  (d.status === "prearbitration" && to === "arbitration");
  if (!allowed) return res.status(409).json({ error: "invalid_transition" });

  const now = Date.now();
  const respondBy = nextDeadline(to, now);
  db.prepare("UPDATE disputes SET status=?, updatedAt=?, respondBy=? WHERE id=?")
    .run(to, now, respondBy, d.id);
  audit(d.id, "DISPUTE_ADVANCED", { from: d.status, to, respondBy });
  res.json({ id: d.id, status: to, respondBy });
});

const Close = z.object({ result: z.enum(["won","lost"]) });
disputes.post("/:id/close", (req, res) => {
  const d = db.prepare("SELECT * FROM disputes WHERE id=?").get(req.params.id) as any;
  if (!d) return res.status(404).json({ error: "not_found" });
  if (["won","lost","accepted"].includes(d.status)) return res.status(409).json({ error: "already_closed" });

  const { result } = Close.parse(req.body);
  const now = Date.now();
  db.prepare("UPDATE disputes SET status=?, updatedAt=?, respondBy=? WHERE id=?")
    .run(result, now, now, d.id);

  if (result === "won") closeWithAdjustment(d, "release");
  else closeWithAdjustment(d, "clawback");

  audit(d.id, "DISPUTE_CLOSED", { result });
  notify("dispute.closed", { id: d.id, result });
  res.json({ id: d.id, status: result });
});

function closeWithAdjustment(d: any, kind: "release" | "clawback") {
  const hold = db.prepare("SELECT * FROM holds WHERE disputeId=? AND releasedAt IS NULL").get(d.id) as any;
  if (hold) {
    db.prepare("UPDATE holds SET releasedAt=? WHERE id=?").run(Date.now(), hold.id);
    db.prepare("INSERT INTO adjustments(id,disputeId,partnerId,currency,kind,amountMinor,createdAt) VALUES(?,?,?,?,?,?,?)")
      .run(nanoid(), d.id, d.partnerId ?? null, d.currency, kind, hold.amountMinor, Date.now());
  }
}


