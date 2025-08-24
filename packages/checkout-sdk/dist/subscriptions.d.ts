import type { CreatePlanParams, Plan, CreateSubscriptionParams } from "./types.js";
export declare class SubscriptionsClient {
    private http;
    constructor(opts: {
        baseUrl: string;
        timeoutMs?: number;
    });
    createPlan(p: CreatePlanParams): Promise<Plan>;
    createSubscription(p: CreateSubscriptionParams): Promise<{
        id: string;
        nextChargeAt: number;
        graceEndsAt: number;
    }>;
    cancelSubscription(id: string): Promise<{
        ok: true;
    }>;
    listDue(): Promise<{
        due: any[];
    }>;
}
