import { Pool } from "pg";
type Params = {
    provider: string;
    currency: string;
    tolerance: number;
    dateWindowDays: number;
    tag?: string;
};
export declare function runReconciliation(pool: Pool, p: Params): Promise<{
    runId: `${string}-${string}-${string}-${string}-${string}`;
    matched: number;
    unmatched: number;
    providerTotal: number;
    matchedTotal: number;
    diffRatio: number;
}>;
export {};
