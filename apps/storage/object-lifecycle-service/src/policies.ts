
import { z } from "zod";
import { db } from "./db.js";
import { nanoid } from "nanoid";

export const PolicySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3),
  scope: z.object({
    bucket: z.string().min(1),
    prefix: z.string().optional().default("")
  }),
  rules: z.object({
    minAgeDays: z.number().int().nonnegative().optional(),
    minLastAccessDays: z.number().int().nonnegative().optional(),
    minSize: z.number().int().nonnegative().optional(),
    maxSize: z.number().int().nonnegative().optional(),
    include: z.array(z.string()).optional(),     // globs .log, .parquet etc
    exclude: z.array(z.string()).optional(),
    toStorageClass: z.enum(["STANDARD_IA","ONEZONE_IA","GLACIER_IR","GLACIER","DEEP_ARCHIVE"]).optional(),
    expireDays: z.number().int().positive().optional(),
    tagSelector: z.record(z.string()).optional() // no-op si no hay tags en origen
  }),
  active: z.boolean().optional().default(true)
});
export type Policy = z.infer<typeof PolicySchema>;

export function upsertPolicy(p: Policy) {
  const now = Date.now();
  const id = p.id ?? nanoid();
  db.prepare(`
    INSERT INTO policies(id,name,scopeBucket,scopePrefix,rules,active,createdAt,updatedAt)
    VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, scopeBucket=excluded.scopeBucket, scopePrefix=excluded.scopePrefix, rules=excluded.rules, active=excluded.active, updatedAt=excluded.updatedAt
  `).run(id, p.name, p.scope.bucket, p.scope.prefix ?? "", JSON.stringify(p.rules), p.active ? 1 : 0, now, now);
  return id;
}

export function listPolicies() {
  const rows = db.prepare("SELECT * FROM policies WHERE active=1 ORDER BY updatedAt DESC").all() as any[];
  return rows.map(r => ({
    id: r.id, name: r.name,
    scope: { bucket: r.scopeBucket, prefix: r.scopePrefix ?? "" },
    rules: JSON.parse(r.rules)
  }));
}


