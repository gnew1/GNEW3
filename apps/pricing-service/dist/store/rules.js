import { detectCollisions } from "../engine/collision";
import { hashToPct } from "../util/hash";
import crypto from "crypto";
function uuid() {
    return crypto.randomUUID();
}
function now() {
    return new Date().toISOString();
}
export class RulesStore {
    audit;
    rulesets = [];
    production; // id de ruleset publicado (prod)
    canary = {};
    constructor(audit) {
        this.audit = audit;
        // Seed inicial
        const rs = {
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
    list() {
        return this.rulesets.slice().sort((a, b) => b.version - a.version);
    }
    getProduction() {
        const rs = this.rulesets.find((x) => x.id === this.production);
        if (!rs)
            throw new Error("no_production_ruleset");
        return rs;
    }
    getById(id) {
        return this.rulesets.find((x) => x.id === id);
    }
    createDraft(name, rules, user, notes) {
        const maxV = Math.max(0, ...this.rulesets.map((x) => x.version));
        const rs = {
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
    updateDraft(id, patch, user) {
        const rs = this.getById(id);
        if (!rs)
            throw new Error("not_found");
        if (rs.status !== "draft")
            throw new Error("not_draft");
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
    validateCollisions(id) {
        const rs = this.getById(id);
        if (!rs)
            throw new Error("not_found");
        const cols = detectCollisions(rs.rules).map((c) => ({ a: c.a.id, b: c.b.id, reason: c.reason }));
        return { ok: cols.length === 0, collisions: cols };
    }
    publish(id, user, label) {
        const rs = this.getById(id);
        if (!rs)
            throw new Error("not_found");
        if (rs.status !== "draft")
            throw new Error("not_draft");
        // Deprecate previous production if any
        if (this.production) {
            const prev = this.getById(this.production);
            if (prev && prev.id !== rs.id && prev.status === "published")
                prev.status = "deprecated";
        }
        rs.status = "published";
        if (label)
            rs.label = label;
        this.production = rs.id;
        this.audit.log({ user, action: "ruleset.publish", after: { id: rs.id, label: rs.label } });
        return rs;
    }
    getCanary() {
        return JSON.parse(JSON.stringify(this.canary));
    }
    setCanary(map, user) {
        const before = this.getCanary();
        // Normalize: clamp percentage 0..100
        const next = {};
        for (const [seg, t] of Object.entries(map)) {
            const pct = Math.max(0, Math.min(100, Number(t.percentage ?? 0)));
            if (!t.versionId)
                continue;
            next[seg] = { versionId: t.versionId, percentage: pct };
        }
        this.canary = next;
        this.audit.log({ user, action: "ruleset.set_canary", before, after: this.canary });
    }
    pickRulesetFor(segment, userId) {
        // Canary by segment
        if (segment) {
            const target = this.canary[segment];
            if (target) {
                const pct = hashToPct(`${userId}:${segment}`);
                if (pct < target.percentage) {
                    const cand = this.getById(target.versionId);
                    if (cand)
                        return cand;
                }
            }
        }
        return this.getProduction();
    }
}
