import { z } from "zod";

export const Role = z.enum(["CFO", "FINANCE_OPS", "GRANTS_LEAD", "RND_LEAD", "EXEC", "VIEWER"]);
export type Role = z.infer<typeof Role>;

export const FundKind = z.enum(["operativo", "grants", "rnd"]);
export type FundKind = z.infer<typeof FundKind>;

export const PolicyInput = z.object({
  // who is initiating / proposing off-chain
  initiator: z.object({
    address: z.string().toLowerCase(),
    role: Role.optional(),
  }),
  // safe and transaction
  tx: z.object({
    safe: z.string().toLowerCase(),
    to: z.string().toLowerCase(),
    valueWei: z.string(), // string to avoid bigint issues
    token: z.string().toLowerCase().nullable(), // null for native
    data: z.string().optional(),
    operation: z.number().int().optional().default(0), // 0 CALL, 1 DELEGATECALL
  }),
  context: z.object({
    chainId: z.number().int(),
    fundKind: FundKind,
    utcHour: z.number().min(0).max(23),
    weekday: z.number().min(0).max(6),
    // dynamic values gathered from Safe service
    threshold: z.number().int().positive(),
    currentApprovals: z.number().int().nonnegative(),
  }),
});

export type PolicyInput = z.infer<typeof PolicyInput>;
export type PolicyDecision = { 
allow: boolean; 
reasons?: string[]; 
requiredSigners?: number; 
maxAmountWei?: string | null; 
}; 
