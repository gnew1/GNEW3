
import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, touchEntity } from "./db.js";

export const ingest = Router();

const Vote = z.object({
  proposalId: z.string().min(1),
  voter: z.string().min(4),
  choice: z.string().optional(),
  txHash: z.string().optional(),
  ts: z.number().int().nonnegative()
});

const Transfer = z.object({
  from: z.string().min(4),
  to: z.string().min(4),
  value: z.string().min(1),     // decimal
  token: z.string().min(2),     // "ETH" o dirección ERC-20
  ts: z.number().int().nonnegative()
});

ingest.post("/vote", (req, res) => {
  try {
    const v = Vote.parse(req.body ?? {});
    const id = nanoid();
    db.prepare(`INSERT INTO votes(id, proposalId, voter, choice, txHash, ts) VALUES(?,?,?,?,?,?)`)
      .run(id, v.proposalId, v.voter.toLowerCase(), v.choice ?? null, v.txHash ?? null, v.ts);
    touchEntity(v.voter.toLowerCase(), v.ts);
    res.json({ ok: true, id });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});

ingest.post("/votes", (req, res) => {
  try {
    const arr = z.array(Vote).min(1).parse(req.body?.items ?? req.body ?? []);
    const stmt = db.prepare(`INSERT INTO votes(id, proposalId, voter, choice, txHash, ts) VALUES(?,?,?,?,?,?)`);
    let n = 0;
    for (const v of arr) {
      stmt.run(nanoid(), v.proposalId, v.voter.toLowerCase(), v.choice ?? null, v.txHash ?? null, v.ts);
      touchEntity(v.voter.toLowerCase(), v.ts);
      n++;
    }
    res.json({ ok: true, inserted: n });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});

ingest.post("/transfers", (req, res) => {
  try {
    const arr = z.array(Transfer).min(1).parse(req.body?.items ?? req.body ?? []);
    const stmt = db.prepare(`INSERT INTO transfers(id, ts, token, fromAddr, toAddr, value) VALUES(?,?,?,?,?,?)`);
    const upEdge = db.prepare(`
      INSERT INTO edges(fromAddr, toAddr, cnt, sumVal, lastTs) VALUES(?,?,?,?,?)
      ON CONFLICT(fromAddr,toAddr) DO UPDATE SET cnt=edges.cnt+1, sumVal=edges.sumVal+excluded.sumVal, lastTs=MAX(edges.lastTs, excluded.lastTs)
    `);
    let n = 0;
    for (const t of arr) {
      const id = nanoid();
      const from = t.from.toLowerCase(), to = t.to.toLowerCase();
      const valueNum = Number(t.value);
      stmt.run(id, t.ts, t.token, from, to, t.value);
      touchEntity(from, t.ts); touchEntity(to, t.ts);
      upEdge.run(from, to, 1, isFinite(valueNum) ? valueNum : 0, t.ts);
      n++;
    }
    res.json({ ok: true, inserted: n });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});


