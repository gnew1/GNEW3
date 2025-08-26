import { z } from "zod";
export const PolicyInput = z.object({
    // who is initiating / proposing off-chain 
    initiator: z.object({
        address: z.string().toLowerCase(),
        role: z.enum(["CFO", "FINANCE_OPS", "GRANTS_LEAD", "RND_LEAD",
            "EXEC", "VIEWER"]).optional()
    }),
    // safe and transaction 
    tx: z.object({
        safe: z.string().toLowerCase(),
        to: z.string().toLowerCase(),
        valueWei: z.string(), // string to avoid bigint issues 
        token: z.string().toLowerCase().nullable(), // null for native 
        data: z.string().optional(),
        operation: z.number().int().optional().default(0), // 0 CALL, 1 
        DELEGATECALL
    }),
    context: z.object({
        chainId: z.number().int(),
        fundKind: z.enum(["operativo", "grants", "rnd"]),
        utcHour: z.number().min(0).max(23),
        weekday: z.number().min(0).max(6),
        // dynamic values gathered from Safe service 
        threshold: z.number().int().positive(),
        currentApprovals: z.number().int().nonnegative()
    })
});
