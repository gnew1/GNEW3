import { newModelFromString, Enforcer, newEnforcer, Model } from "casbin";

export async function buildEnforcer(modelStr: string, policyCsv: string): Promise<Enforcer> {
  const m: Model = newModelFromString(modelStr);
  const e = await newEnforcer(m);
  // Cargamos políticas CSV (en memoria)
  const lines = policyCsv.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  for (const ln of lines) {
    const cols = ln.split(",").map(s => s.trim());
    if (cols[0] === "p") {
      // p, sub, obj, act, cond, eft?
      const p = cols.slice(1);
      if (p.length === 4) await e.addPolicy(...p);
      else if (p.length === 5) await e.addPolicy(p[0], p[1], p[2], p[3], p[4]);
    } else if (cols[0].startsWith("g")) {
      await e.addGroupingPolicy(...cols.slice(1));
    }
  }
  return e;
}

