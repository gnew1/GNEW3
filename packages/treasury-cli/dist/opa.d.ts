import { PolicyDecision, PolicyInput } from "./types.js";
export declare function evaluatePolicy(opaUrl: string, input: PolicyInput): Promise<PolicyDecision>;
export declare function logDecision(opaAuditUrl: string | undefined, payload: unknown): Promise<void>;
