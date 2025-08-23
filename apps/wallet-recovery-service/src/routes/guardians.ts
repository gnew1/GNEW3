
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { writeAudit } from "../audit.js";
import { nanoid } from "nanoid";
import { notify } from "../notifier.js";

export const guardians = Router();

const Nominate = z.object({
  walletId: z.string().min(8),
  guardians: z.array(z.object({
    label: z.string().min(1),
    pubkeyEd25519: z.string().min(32),
    contact: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      webhook: z.string().url().optional()
    }),
    expiresAt: z.number().int().positive()
  })).min(1)
});

guardians.post("/nominate", async (req, res) => {
  const { walletId, guardians: list } = Nominate.parse(req.body);
  const now = Date.now();

  const insert = db.prepare(`
    INSERT INTO guardians(id,walletId,label,pubkeyEd25519,contactEmail,contactPhone,contactWebhook,expiresAt,createdAt,active)
    VALUES(?,?,?,?,?,?,?,?,?,1)
  `);

  for (const g of list) {
    const id = nanoid();
    insert.run(id, walletId, g.label, g.pubkeyEd25519, g.contact.email ?? null, g.contact.phone ?? null, g.contact.webhook ?? null, g.expiresAt, now);
    writeAudit(walletId, "GUARDIAN_NOMINATED", { id, label: g.label, expiresAt: g.expiresAt });
    await notify(g.contact, "Nombrado como guardián", `Has sido nominado guardián de ${walletId}. Expira: ${new Date(g.expiresAt).toISOString()}`);
  }

  res.json({ ok: true, added: list.length });
});

const Confirm = z.object({
  walletId: z.string().min(8),
  guardianId: z.string().min(6)
});

guardians.post("/confirm", async (req, res) => {
  const { walletId, guardianId } = Confirm.parse(req.body);
  const upd = db.prepare("UPDATE guardians SET active=1 WHERE id=? AND walletId=?");
  upd.run(guardianId, walletId);
  writeAudit(walletId, "GUARDIAN_CONFIRMED", { guardianId });
  res.json({ ok: true });
});

guardians.get("/list", (req, res) => {
  const walletId = String(req.query.walletId ?? "");
  const rows = db.prepare("SELECT * FROM guardians WHERE walletId=? AND active=1 AND expiresAt > ?").all(walletId, Date.now());
  res.json(rows);
});


