
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";
import { cfg } from "../config.js";

export const advisor = Router();

const Req = z.object({
  bucket: z.string().min(3),
  prefix: z.string().default(""),
  rules: z.object({
    minAgeDays: z.number().int().nonnegative().optional(),
    minSize: z.number().int().nonnegative().optional(),
    toStorageClass: z.enum(["STANDARD_IA","ONEZONE_IA","GLACIER_IR","GLACIER","DEEP_ARCHIVE"]).optional(),
    expireAfterDays: z.number().int().positive().nullable().optional()
  }),
  limit: z.number().int().min(1).max(100000).optional(),
  dryRun: z.boolean().default(true)
});

function priceFor(cls: string) {
  const p = cfg.priceUSD as any;
  return p[cls] ?? p.STANDARD;
}

advisor.post("/advisor/plan", (req, res) => {
  try {
    const p = Req.parse(req.body ?? {});
    const now = Date.now();
    const limit = Math.min(100000, p.limit ?? 5000);

    const rows = db.prepare(`
      SELECT key, size, storageClass, lastModified
      FROM objects
      WHERE bucket=? AND key LIKE ?
      LIMIT ?
    `).all(p.bucket, `${p.prefix}%`, limit) as any[];

    const planId = nanoid();
    let items: any[] = [];
    let estSavings = 0;

    for (const r of rows) {
      const ageDays = (now - Number(r.lastModified)) / 86400000;
      const size = Number(r.size);
      const from = String(r.storageClass ?? "STANDARD");

      // filtros
      if (p.rules.minAgeDays != null && ageDays < p.rules.minAgeDays) continue;
      if (p.rules.minSize != null && size < p.rules.minSize) continue;

      // decisión
      if (p.rules.expireAfterDays != null && ageDays >= p.rules.expireAfterDays) {
        items.push({
          key: r.key, size, fromClass: from,
          action: "expire", toClass: null,
          reason: `age>=${p.rules.expireAfterDays}d`,
          estSavingsUSD: (size / (1024 ** 4)) * priceFor(from)
        });
        estSavings += items[items.length - 1].estSavingsUSD;
      } else if (p.rules.toStorageClass && from !== p.rules.toStorageClass) {
        const fromUSD = priceFor(from);
        const toUSD = priceFor(p.rules.toStorageClass);
        const delta = ((fromUSD - toUSD) * (size / (1024 ** 4))); // ahorro mensual
        if (delta > 0) {
          items.push({
            key: r.key, size, fromClass: from,
            action: "transition", toClass: p.rules.toStorageClass,
            reason: `age>=${p.rules.minAgeDays ?? 0}d AND size>=${p.rules.minSize ?? 0}`,
            estSavingsUSD: delta
          });
          estSavings += delta;
        }
      }
    }

    db.prepare("INSERT INTO plans(id,bucket,prefix,dryRun,total,estSavingsUSD,createdAt) VALUES(?,?,?,?,?,?,?)")
      .run(planId, p.bucket, p.prefix, p.dryRun ? 1 : 0, items.length, estSavings, now);
    const stmt = db.prepare("INSERT INTO plan_items(id,planId,key,size,fromClass,action,toClass,reason,estSavingsUSD) VALUES(?,?,?,?,?,?,?,?,?)");
    for (const it of items) {
      stmt.run(nanoid(), planId, it.key, it.size, it.fromClass, it.action, it.toClass, it.reason, it.estSavingsUSD);
    }

    res.json({ ok: true, planId, total: items.length, estSavingsUSD: estSavings, sample: items.slice(0, 50) });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});

advisor.get("/plans/:planId", (req, res) => {
  const plan = db.prepare("SELECT * FROM plans WHERE id=?").get(req.params.planId) as any;
  if (!plan) return res.status(404).json({ ok: false, error: "not_found" });
  const items = db.prepare("SELECT key,size,fromClass,action,toClass,reason,estSavingsUSD FROM plan_items WHERE planId=? LIMIT 10000").all(req.params.planId) as any[];
  if (String(req.query.format ?? "") === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.write("key,size,fromClass,action,toClass,reason,estSavingsUSD\n");
    for (const it of items) {
      res.write(`${csv(it.key)},${it.size},${it.fromClass},${it.action},${it.toClass ?? ""},${csv(it.reason)},${it.estSavingsUSD.toFixed(6)}\n`);
    }
    return res.end();
  }
  res.json({ ok: true, plan, items });
});

function csv(s: string) {
  const q = String(s).replace(/"/g, '""');
  if (/[",\n]/.test(q)) return `"${q}"`;
  return q;
}


