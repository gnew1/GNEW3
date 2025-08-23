
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";

export const ingest = Router();

const Ingest = z.object({
  address: z.string().min(4),
  kind: z.enum(["tx","alert","label"]),
  payload: z.any()
});

ingest.post("/", (req, res) => {
  const p = Ingest.parse(req.body ?? {});
  const address = p.address.toLowerCase();
  const now = Date.now();

  // upsert wallet minimal
  const w = db.prepare("SELECT address, firstSeenAt FROM wallets WHERE address=?").get(address) as any;
  if (!w) {
    db.prepare("INSERT INTO wallets(address, firstSeenAt, lastSeenAt, score, decision, reasons) VALUES(?,?,?,?,?,?)")
      .run(address, now, now, 0, "allow", "[]");
  } else {
    db.prepare("UPDATE wallets SET lastSeenAt=? WHERE address=?").run(now, address);
  }

  db.prepare("INSERT INTO wallet_events(id,address,kind,payload,ts) VALUES(?,?,?,?,?)")
    .run(nanoid(), address, p.kind, JSON.stringify(p.payload ?? {}), now);

  // contadores de velocidad (por hora)
  if (p.kind === "tx") {
    const key = `vel:${address}:${Math.floor(now / (60*60*1000))}`;
    const row = db.prepare("SELECT value FROM counters WHERE key=?").get(key) as any;
    const v = (row?.value ?? 0) + 1;
    db.prepare(`
      INSERT INTO counters(key,value,updatedAt) VALUES(?,?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt
    `).run(key, v, now);
  }

  // contraparte (si se envía en payload)
  const cp = p.payload?.counterparty as string | undefined;
  const risk = Number(p.payload?.counterpartyRisk ?? NaN);
  if (cp && Number.isFinite(risk)) {
    db.prepare(`
      INSERT INTO counterparts(id,address,counterparty,risk,lastSeenAt) VALUES(?,?,?,?,?)
    `).run(nanoid(), address, cp.toLowerCase(), Math.max(0, Math.min(100, risk)), now);
  }

  res.json({ ok: true });
});


