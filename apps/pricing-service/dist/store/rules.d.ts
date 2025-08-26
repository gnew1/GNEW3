import { Ruleset, Rule } from "../engine/types";
import { AuditStore } from "./audit";
export type CollisionReport = {
    ok: boolean;
    collisions: {
        a: string;
        b: string;
        reason: string;
    }[];
};
export type CanaryTarget = {
    versionId: string;
    percentage: number;
};
export type CanaryMap = {
    [segment: string]: CanaryTarget;
};
export declare class RulesStore {
    private readonly audit;
    private readonly rulesets;
    private production?;
    private canary;
    constructor(audit: AuditStore);
    list(): Ruleset[];
    getProduction(): Ruleset;
    getById(id: string): Ruleset | undefined;
    createDraft(name: string, rules: Rule[], user: string, notes?: string): Ruleset;
    updateDraft(id: string, patch: Partial<Ruleset>, user: string): Ruleset;
    validateCollisions(id: string): CollisionReport;
    publish(id: string, user: string, label?: string): Ruleset;
    getCanary(): CanaryMap;
    setCanary(map: CanaryMap, user: string): void;
    pickRulesetFor(segment: string | undefined, userId: string): Ruleset;
}
