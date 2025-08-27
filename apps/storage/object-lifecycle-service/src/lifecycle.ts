
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
  const includes = (policy.rules.include ?? []).length ? (policy.rules.include as string[]).some((suffix: string) => key.endsWith(suffix)) : true;
  const excludes = (policy.rules.exclude ?? []).length ? (policy.rules.exclude as string[]).some((suffix: string) => key.endsWith(suffix)) : false;
  
  if (!includes || excludes) return { action: "noop", reason: "filtered" };

  // Reglas por edad y acceso
  for (const rule of policy.rules.lifecycle ?? []) {
    if (rule.minAgeDays && ageDays >= rule.minAgeDays) {
      if (rule.action === "transition" && rule.toClass) {
        if (storageClass !== rule.toClass) {
          return { action: "transition", toClass: rule.toClass, reason: `age ${Math.floor(ageDays)}d >= ${rule.minAgeDays}d` };
        }
      } else if (rule.action === "expire") {
        return { action: "expire", reason: `age ${Math.floor(ageDays)}d >= ${rule.minAgeDays}d` };
      }
    }
    
    if (rule.minLastAccessDays && lastAccessDays >= rule.minLastAccessDays) {
      if (rule.action === "transition" && rule.toClass) {
        if (storageClass !== rule.toClass) {
          return { action: "transition", toClass: rule.toClass, reason: `last access ${Math.floor(lastAccessDays)}d >= ${rule.minLastAccessDays}d` };
        }
      } else if (rule.action === "expire") {
        return { action: "expire", reason: `last access ${Math.floor(lastAccessDays)}d >= ${rule.minLastAccessDays}d` };
      }
    }
  }

  return { action: "noop", reason: "no rules matched" };
}

export async function executePlan(planId: string, opts: { dryRun?: boolean } = {}) {
  const dryRun = opts.dryRun ?? false;
  const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  const items = db.prepare("SELECT * FROM plan_items WHERE planId = ?").all(planId) as any[];
  const results: any[] = [];

  for (const item of items) {
    try {
      let result: any = { key: item.key, action: item.action, success: false };
      
      if (!dryRun) {
        if (item.action === "transition" && item.toClass) {
          await transitionTo(item.key, item.toClass);
          result.success = true;
          result.message = `Transitioned to ${item.toClass}`;
        } else if (item.action === "expire") {
          await deleteKey(item.key);
          result.success = true;
          result.message = "Deleted";
        }
      } else {
        result.success = true;
        result.message = `Would ${item.action}${item.toClass ? ` to ${item.toClass}` : ''}`;
      }
      
      results.push(result);
    } catch (error: any) {
      results.push({ 
        key: item.key, 
        action: item.action, 
        success: false, 
        error: error.message 
      });
    }
  }

  // Actualizar plan como ejecutado
  if (!dryRun) {
    db.prepare("UPDATE plans SET dryRun = 0, executedAt = ? WHERE id = ?")
      .run(Date.now(), planId);
  }

  return { planId, results, dryRun };
}

export async function getCostEstimate(planId: string) {
  const items = db.prepare("SELECT * FROM plan_items WHERE planId = ?").all(planId) as any[];
  let totalSavings = 0;

  for (const item of items) {
    if (item.action === "transition" && item.toClass) {
      const currentCost = storageCostPerTB[item.storageClass] || 0;
      const newCost = storageCostPerTB[item.toClass] || 0;
      const sizeInTB = item.size / (1024 * 1024 * 1024 * 1024);
      totalSavings += (currentCost - newCost) * sizeInTB * 12; // yearly savings
    } else if (item.action === "expire") {
      const currentCost = storageCostPerTB[item.storageClass] || 0;
      const sizeInTB = item.size / (1024 * 1024 * 1024 * 1024);
      totalSavings += currentCost * sizeInTB * 12; // yearly savings
    }
  }

  return { totalSavings, currency: "USD" };
}

