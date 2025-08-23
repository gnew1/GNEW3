
/** Evaluador ABAC simple */
type Rule = { effect: "allow" | "deny"; when: Cond };
type Cond =
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond }
  | { equals: [string, string] }
  | { in: [string | string[], string] }        // value IN array || string contains
  | { present: string };

export type Policy = { id: string; name: string; version: number; rules: Rule[] };

export function evaluate(policy: Policy, ctx: any): { decision: "allow" | "deny"; reason?: string } {
  // Por defecto deny si no aplica ninguna regla allow
  for (const r of policy.rules) {
    if (evalCond(r.when, ctx)) return { decision: r.effect, reason: `rule_${r.effect}` };
  }
  return { decision: "deny", reason: "implicit_deny" };
}

function get(path: string, obj: any): any {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}
function isArrayLike(x: any): x is any[] { return Array.isArray(x); }
function evalCond(c: Cond, ctx: any): boolean {
  if ("all" in c) return c.all.every((cc) => evalCond(cc, ctx));
  if ("any" in c) return c.any.some((cc) => evalCond(cc, ctx));
  if ("not" in c) return !evalCond(c.not, ctx);
  if ("equals" in c) {
    const [a, b] = c.equals;
    return String(get(a, ctx)) === String(get(b, ctx));
  }
  if ("in" in c) {
    const [left, right] = c.in;
    const L = typeof left === "string" ? get(left, ctx) : left;
    const R = get(right, ctx) ?? right;
    if (isArrayLike(L)) return L.map(String).includes(String(R));
    if (isArrayLike(R)) return R.map(String).includes(String(L));
    if (typeof L === "string" && typeof R === "string") return L.includes(R) || R.includes(L);
    return false;
  }
  if ("present" in c) return get(c.present, ctx) != null;
  return false;
}


