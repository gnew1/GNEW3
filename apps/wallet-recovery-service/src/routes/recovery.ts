
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";
import { writeAudit } from "../audit.js";
import { verifyEd25519, randomKEKHex } from "../crypto.js";
import { combineKEK } from "../sss.js";

export const recovery = Router();

const Initiate = z.object({
  walletId: z.string().min(8),
  threshold: z.number().int().min(2),
  total: z.number().int().min(2),
  disputeWindowMs: z.number().int().min(60_000),
  evidence: z.any() // e.g., platform biometric attest summary
});

recovery.post("/initiate", (req, res) => {
  const p = Initiate.parse(req.body);
  if (p.threshold > p.total) return res.status(400).json({ error: "threshold_gt_total" });

  // Validate guardians availability
  const activeGuardians = db.prepare("SELECT id FROM guardians WHERE walletId=? AND active=1 AND expiresAt>?").all(p.walletId, Date.now());
  if (activeGuardians.length < p.total) return res.status(400).json({ error: "not_enough_guardians_active" });

  const id = nanoid();
  const startedAt = Date.now();
  const session = {
    id,
    walletId: p.walletId,
    threshold: p.threshold,
    total: p.total,
    disputeWindowMs: p.disputeWindowMs,
    startedAt,
    completeAfter: startedAt + p.disputeWindowMs,
    evidence: JSON.stringify(p.evidence)
  };
  db.prepare(`INSERT INTO recovery_sessions(id,walletId,threshold,total,disputeWindowMs,startedAt,completeAfter,evidence)
              VALUES(@id,@walletId,@threshold,@total,@disputeWindowMs,@startedAt,@completeAfter,@evidence)`).run(session);
  writeAudit(p.walletId, "RECOVERY_STARTED", { sessionId: id, threshold: p.threshold, total: p.total });

  res.json({ ok: true, sessionId: id, completeAfter: session.completeAfter });
});

const Approve = z.object({
  sessionId: z.string().min(6),
  guardianId: z.string().min(6),
  signatureB64: z.string().min(64),
  shareCipherB64: z.string().min(16)
});

recovery.post("/approve", async (req, res) => {
  const p = Approve.parse(req.body);
  const s = db.prepare("SELECT * FROM recovery_sessions WHERE id=?").get(p.sessionId);
  if (!s) return res.status(404).json({ error: "session_not_found" });
  if (s.canceledAt) return res.status(409).json({ error: "session_canceled" });
  if (Date.now() > s.completeAfter) return res.status(409).json({ error: "window_expired" });

  const g = db.prepare("SELECT * FROM guardians WHERE id=? AND walletId=? AND active=1 AND expiresAt>?")
              .get(p.guardianId, s.walletId, Date.now());
  if (!g) return res.status(404).json({ error: "guardian_not_active" });

  const message = JSON.stringify({ sessionId: p.sessionId, walletId: s.walletId, guardianId: p.guardianId });
  const ok = await verifyEd25519(g.pubkeyEd25519, message, p.signatureB64);
  if (!ok) return res.status(400).json({ error: "bad_signature" });

  db.prepare(`INSERT INTO approvals(id,sessionId,guardianId,signatureB64,shareCipherB64,createdAt)
              VALUES(?,?,?,?,?,?)`).run(nanoid(), p.sessionId, p.guardianId, p.signatureB64, p.shareCipherB64, Date.now());
  writeAudit(s.walletId, "RECOVERY_APPROVAL", { sessionId: p.sessionId, guardianId: p.guardianId });

  // Count approvals
  const count = db.prepare("SELECT COUNT(*) as c FROM approvals WHERE sessionId=?").get(p.sessionId) as { c: number };
  res.json({ ok: true, approvals: count.c, threshold: s.threshold });
});

const Dispute = z.object({
  sessionId: z.string().min(6),
  reason: z.string().min(3)
});

recovery.post("/dispute", (req, res) => {
  const p = Dispute.parse(req.body);
  const s = db.prepare("SELECT * FROM recovery_sessions WHERE id=?").get(p.sessionId);
  if (!s) return res.status(404).json({ error: "session_not_found" });
  if (Date.now() > s.completeAfter) return res.status(409).json({ error: "window_expired" });
  if (s.canceledAt) return res.status(409).json({ error: "already_canceled" });

  db.prepare("UPDATE recovery_sessions SET canceledAt=? WHERE id=?").run(Date.now(), p.sessionId);
  writeAudit(s.walletId, "RECOVERY_DISPUTED", { sessionId: p.sessionId, reason: p.reason });
  res.json({ ok: true });
});

const Complete = z.object({
  sessionId: z.string().min(6)
});

recovery.post("/complete", (req, res) => {
  const p = Complete.parse(req.body);
  const s = db.prepare("SELECT * FROM recovery_sessions WHERE id=?").get(p.sessionId);
  if (!s) return res.status(404).json({ error: "session_not_found" });
  if (s.canceledAt) return res.status(409).json({ error: "session_canceled" });
  if (Date.now() < s.completeAfter) return res.status(409).json({ error: "dispute_window_open" });

  const rows = db.prepare("SELECT shareCipherB64 FROM approvals WHERE sessionId=?").all(p.sessionId) as { shareCipherB64: string }[];
  if (rows.length < s.threshold) return res.status(409).json({ error: "insufficient_approvals" });

  // In untrusted infra: shares should be encrypted client-side; server only moves bytes.
  // Here we simulate combination; in prod, the client combines locally after fetching t shares.
  const shares = rows.slice(0, s.threshold).map(r => r.shareCipherB64);
  const kekHex = combineKEK(shares); // returns hex KEK
  db.prepare("UPDATE recovery_sessions SET completedAt=? WHERE id=?").run(Date.now(), p.sessionId);
  writeAudit(s.walletId, "RECOVERY_COMPLETED", { sessionId: p.sessionId, sharesUsed: s.threshold });

  res.json({ ok: true, kekHex }); // Client uses KEK to decrypt seed locally.
});

export { Initiate };


