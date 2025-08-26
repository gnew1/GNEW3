import { QuoteInput, QuoteResult, Rule } from "./types";
import { RulesStore } from "../store/rules";
export declare class PriceEngine {
    private store;
    private cache;
    constructor(store: RulesStore);
    quote(input: QuoteInput): Promise<QuoteResult>;
    invalidate(): void;
}
export declare function applyRules(input: QuoteInput, rules: Rule[]): Omit<QuoteResult, "rulesetVersion" | "rulesetId">;
