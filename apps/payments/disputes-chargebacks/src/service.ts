
import { db } from "./db.js";
import { computeDeadlines } from "./plazos.js";
import { riskScore } from "./risk.js";
import { writeAudit } from "./audit.js";
import { nanoid } from "nanoid";

export function openDispute(p: {
  orderId: string;
  partnerId: string;
  currency: string;
  amountMinor: number;
  reason: string;
  scheme: "card"|"bank"|"wallet";
}) {
  const now = Date.now();
  const { evidenceDueAt, arbitrationDueAt } = computeDeadlines(p.scheme, now);
  const risk = riskScore({ partnerId: p.partnerId, amountMinor: p.amountMinor, reason: p.reason });
  const id = nanoid();
  db.prepare(`INSERT INTO disputes(id,orderId,partnerId,currency,amountMinor,reason,scheme,state,riskScore,createdAt,evidenceDueAt,arbitrationDueAt)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, p.orderId, p.partnerId, p.currency, p.amountMinor, p.reason, p.scheme, "open", risk, now, evidenceDueAt, arbitrationDueAt);

  // Hold de fondos (bloqueo)
  const holdId = nanoid();
  db.prepare(`INSERT INTO holds(id,disputeId,partnerId,currency,amountMinor,state,createdAt)
              VALUES(?,?,?,?,?,?,?)`).run(holdId, id, p.partnerId, p.currency, p.amountMinor, "active", now);

  addEvent(id, "OPENED", { ...p, risk, evidenceDueAt, arbitrationDueAt });
  writeAudit(id, "OPENED", p);
  return { id, risk, evidenceDueAt, arbitrationDueAt };
}

export function addEvidence(disputeId: string, ev: { type: string; content: unknown }) {
  const d = getDispute(disputeId);
  if (!d) throw new Error("not_found");
  if (d.state !== "open") throw new Error("invalid_state");
  db.prepare("INSERT INTO evidence(id,disputeId,type,content,createdAt) VALUES(?,?,?,?,?)")
    .run(nanoid(), disputeId, ev.type, JSON.stringify(ev.content), Date.now());
  addEvent(disputeId, "EVIDENCE_ADDED", ev);
  writeAudit(disputeId, "EVIDENCE_ADDED", ev);
}

export function submitEvidence(disputeId: string) {
  const d = getDispute(disputeId);
  if (!d) throw new Error("not_found");
  if (d.state !== "open") throw new Error("invalid_state");
  db.prepare("UPDATE disputes SET state='submitted' WHERE id=?").run(disputeId);
  addEvent(disputeId, "SUBMITTED", {});
  writeAudit(disputeId, "SUBMITTED", {});
}

export function resolve(disputeId: string, p: { outcome: "won"|"lost"|"partial"; chargebackMinor?: number }) {
  const d = getDispute(disputeId);
  if (!d) throw new Error("not_found");
  if (!["open","submitted"].includes(d.state)) throw new Error("invalid_state");

  const now = Date.now();
  let cbMinor = 0;
  if (p.outcome === "lost") cbMinor = d.amountMinor;
  else if (p.outcome === "partial") cbMinor = Math.min(d.amountMinor, Math.max(0, p.chargebackMinor ?? 0));
  else cbMinor = 0;

  // Hold → applied o released
  const hold = db.prepare("SELECT * FROM holds WHERE disputeId=? AND state='active'").get(disputeId) as any;
  if (hold) {
    if (cbMinor > 0) {
      db.prepare("UPDATE holds SET state='applied', appliedAt=? WHERE id=?").run(now, hold.id);
    } else {
      db.prepare("UPDATE holds SET state='released', releasedAt=? WHERE id=?").run(now, hold.id);
    }
  }

  // Ajuste contable por chargeback (negativo)
  if (cbMinor > 0) {
    db.prepare("INSERT INTO adjustments(id,disputeId,partnerId,currency,amountMinor,reason,createdAt) VALUES(?,?,?,?,?,?,?)")
      .run(nanoid(), disputeId, d.partnerId, d.currency, -cbMinor, p.outcome === "partial" ? "partial" : "chargeback", now);
  }

  db.prepare("UPDATE disputes SET state=?, closedAt=? WHERE id=?").run(p.outcome, now, disputeId);
  addEvent(disputeId, "RESOLVED", { outcome: p.outcome, chargebackMinor: cbMinor });
  writeAudit(disputeId, "RESOLVED", { outcome: p.outcome, chargebackMinor: cbMinor });

  return { outcome: p.outcome, chargebackMinor: cbMinor };
}

export function getDispute(id: string) {
  return db.prepare("SELECT * FROM disputes WHERE id=?").get(id) as any;
}

export function listDisputes(q: { state?: string; partnerId?: string; from?: number; to?: number }) {
  const conds: string[] = [];
  const params: any[] = [];
  if (q.state) { conds.push("state=?"); params.push(q.state); }
  if (q.partnerId) { conds.push("partnerId=?"); params.push(q.partnerId); }
  if (q.from) { conds.push("createdAt>=?"); params.push(q.from); }
  if (q.to) { conds.push("createdAt<=?"); params.push(q.to); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  return db.prepare(`SELECT * FROM disputes ${where} ORDER BY createdAt DESC`).all(...params) as any[];
}

export function evidenceFor(disputeId: string) {
  return db.prepare("SELECT id,type,content,createdAt FROM evidence WHERE disputeId=? ORDER BY createdAt ASC").all(disputeId) as any[];
}

export function eventsFor(disputeId: string) {
  return db.prepare("SELECT id,kind,payload,ts FROM dispute_events WHERE disputeId=? ORDER BY ts ASC").all(disputeId) as any[];
}

function addEvent(disputeId: string, kind: string, payload: unknown) {
  db.prepare("INSERT INTO dispute_events(id,disputeId,kind,payload,ts) VALUES(?,?,?,?,?)")
    .run(nanoid(), disputeId, kind, JSON.stringify(payload), Date.now());
}


