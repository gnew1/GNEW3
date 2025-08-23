
import { listKeys, head, transitionTo, deleteKey, storageCostPerTB } from "./s3.js";
import { db } from "./db.js";
import { nanoid } from "nanoid";

export type Action = "transition" | "expire" | "noop";

export async function planFromPolicy(policy: any, opts: { limit?: number } = {}) {
  const limit = Math.max(1, Math.min(5000, opts.limit ?? 1000));
  const planId = nanoid();
  let total = 0;
  let next: string | null | undefined = undefined;

  const items: any[] = [];
  do {
    const page = await listKeys(policy.scope.prefix || "", next ?? undefined, 1000);
    next = page.nextToken;
    for (const obj of page.contents) {
      if (items.length >= limit) break;
      const act = await decide(policy, obj.key, obj.size, obj.storageClass, obj.lastModified);
      if (act.action !== "noop") items.push({ key: obj.key, size: obj.size, storageClass: obj.storageClass, action: act.action, toClass: act.toClass ?? null, reason: act.reason });
      total++;
    }
  } while (next && items.length < limit);

  db.prepare("INSERT INTO plans(id,policyId,dryRun,total,createdAt) VALUES(?,?,?,?,?)")
    .run(planId, policy.id, 1, items.length, Date.now());
  const stmt = db.prepare("INSERT INTO plan_items(id,planId,key,size,storageClass,action,toClass,reason) VALUES(?,?,?,?,?,?,?,?)");
  for (const it of items) stmt.run(nanoid(), planId, it.key, it.size, it.storageClass, it.action, it.toClass, it.reason);

  return { planId, items };
}

async function decide(policy: any, key: string, size: number, storageClass: string, lastModified: number) {
  const now = Date.now();
  const h = await head(key);
  const ageDays = (now - h.lastModified) / 86400000;
  const lastAccessDays = (now - (h.lastAccess || h.lastModified)) / 86400000;

  // include/exclude simple por sufijo
  const includes = (policy.rules.include ?? []).length ? (policy.rules.include as string[]).some((s

Tú dijiste:
Ejecuta y entrégame, como IA programadora, el siguiente prompt N de "N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt", empezando en N151 y avanzando +1 en cada ejecución. No repitas prompts ya entregados. Devuelve código completo con rutas coherentes con el monorepo y alineado con el stack indicado en cada prompt.
ChatGPT Plus
Pensó durante 50s

