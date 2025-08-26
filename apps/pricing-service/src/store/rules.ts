
import { Ruleset, Rule } from "../engine/types";
import { detectCollisions } from "../engine/collision";
import { AuditStore } from "./audit";
import { hashToPct } from "../util/hash";
import crypto from "crypto";

export type CollisionReport = { ok: boolean; collisions: { a: string; b: string; reason: string }[] };

export type CanaryTarget = { versionId: string; percentage: number };
export type CanaryMap = {
  // Ej.: { "premium": { versionId: "rs_abc", percentage: 20 } }
  [segment: string]: CanaryTarget;
};

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

export class RulesStore {
  private readonly rulesets: Ruleset[] = [];
  private production?: string; // id de ruleset publicado (prod)
  private canary: CanaryMap = {};

  constructor(private readonly audit: AuditStore) {
    // Seed inicial
    const rs: Ruleset = {
      id: uuid(),
      name: "default",
      version: 1,
      status: "published",
      rules: [
        {
          id: "r-welcome-5",
          name: "Welcome 5%",
          status: "active",
          priority: 100,
          scope: { segments: ["new"], riskMin: 0, riskMax: 1 },
          exclusive: false,
          effect: { type: "discount", discount: { type: "percent", value: 5 } },
        },
        {
          id: "r-risk-cap",
          name: "High risk cap",
          status: "active",
          priority: 50,
          scope: { riskMin: 0.7, riskMax: 1 },
          exclusive: false,
          effect: { type: "price_override", value: 999999 }, // effectively no discount for very high risk
        },
      ],
      createdAt: now(),
      createdBy: "system",
    };
    this.rulesets.push(rs);
    this.production = rs.id;
  }

  list(): Ruleset[] {
    return this.rulesets.slice().sort((a, b) => b.version - a.version);
  }

  getProduction(): Ruleset {
    const rs = this.rulesets.find((x) => x.id === this.production);
    if (!rs) throw new Error("no_production_ruleset");
    return rs;
  }

  getById(id: string): Ruleset | undefined {
    return this.rulesets.find((x) => x.id === id);
  }

  createDraft(name: string, rules: Rule[], user: string, notes?: string): Ruleset {
    const maxV = Math.max(0, ...this.rulesets.map((x) => x.version));
    const rs: Ruleset = {
      id: uuid(),
      name,
      version: maxV + 1,
      status: "draft",
      rules,
      notes,
      createdAt: now(),
      createdBy: user,
    };
    this.rulesets.push(rs);
    this.audit.log({ user, action: "ruleset.create_draft", after: { id: rs.id, version: rs.version } });
    return rs;
  }

  updateDraft(id: string, patch: Partial<Ruleset>, user: string): Ruleset {
    const rs = this.getById(id);
    if (!rs) throw new Error("not_found");
    if (rs.status !== "draft") throw new Error("not_draft");
  // shallow update of draft
    if (typeof patch.name === "string" && patch.name.length > 0) {
      rs.name = patch.name;
    }
    if (Array.isArray(patch.rules)) {
      rs.rules = patch.rules;
    }
    if (typeof patch.notes === "string") {
      rs.notes = patch.notes;
    }
    this.audit.log({ user, action: "ruleset.update_draft", before: { id }, after: { id } });
    return rs;
  }

  validateCollisions(id: string): CollisionReport {
    const rs = this.getById(id);
    if (!rs) throw new Error("not_found");
    const cols = detectCollisions(rs.rules).map((c) => ({ a: c.a.id, b: c.b.id, reason: c.reason }));
    return { ok: cols.length === 0, collisions: cols };
  }

  publish(id: string, user: string, label?: string): Ruleset {
    const rs = this.getById(id);
    if (!rs) throw new Error("not_found");
    if (rs.status !== "draft") throw new Error("not_draft");
    // Deprecate previous production if any
    if (this.production) {
      const prev = this.getById(this.production);
      if (prev && prev.id !== rs.id && prev.status === "published") prev.status = "deprecated";
    }
    rs.status = "published";
    if (label) rs.label = label;
    this.production = rs.id;
    this.audit.log({ user, action: "ruleset.publish", after: { id: rs.id, label: rs.label } });
    return rs;
  }

  getCanary(): CanaryMap {
    return JSON.parse(JSON.stringify(this.canary));
  }

  setCanary(map: CanaryMap, user: string) {
    const before = this.getCanary();
    // Normalize: clamp percentage 0..100
    const next: CanaryMap = {};
    for (const [seg, t] of Object.entries(map)) {
      const pct = Math.max(0, Math.min(100, Number(t.percentage ?? 0)));
      if (!t.versionId) continue;
      next[seg] = { versionId: t.versionId, percentage: pct };
    }
    this.canary = next;
    this.audit.log({ user, action: "ruleset.set_canary", before, after: this.canary });
  }

  pickRulesetFor(segment: string | undefined, userId: string): Ruleset {
    // Canary by segment
    if (segment) {
      const target = this.canary[segment];
      if (target) {
        const pct = hashToPct(`${userId}:${segment}`);
        if (pct < target.percentage) {
          const cand = this.getById(target.versionId);
          if (cand) return cand;
        }
      }
    }
    return this.getProduction();
  }
}

