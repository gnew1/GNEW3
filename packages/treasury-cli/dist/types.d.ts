import { z } from "zod";
export declare const PolicyInput: z.ZodObject<{
    initiator: z.ZodObject<{
        address: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<["CFO", "FINANCE_OPS", "GRANTS_LEAD", "RND_LEAD", "EXEC", "VIEWER"]>>;
    }, "strip", z.ZodTypeAny, {
        address?: string;
        role?: "CFO" | "FINANCE_OPS" | "GRANTS_LEAD" | "RND_LEAD" | "EXEC" | "VIEWER";
    }, {
        address?: string;
        role?: "CFO" | "FINANCE_OPS" | "GRANTS_LEAD" | "RND_LEAD" | "EXEC" | "VIEWER";
    }>;
    tx: z.ZodObject<{
        safe: z.ZodString;
        to: z.ZodString;
        valueWei: z.ZodString;
        token: z.ZodNullable<z.ZodString>;
        data: z.ZodOptional<z.ZodString>;
        operation: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        safe?: string;
        to?: string;
        valueWei?: string;
        token?: string;
        data?: string;
        operation?: number;
    }, {
        safe?: string;
        to?: string;
        valueWei?: string;
        token?: string;
        data?: string;
        operation?: number;
    }>;
    context: z.ZodObject<{
        chainId: z.ZodNumber;
        fundKind: z.ZodEnum<["operativo", "grants", "rnd"]>;
        utcHour: z.ZodNumber;
        weekday: z.ZodNumber;
        threshold: z.ZodNumber;
        currentApprovals: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        chainId?: number;
        fundKind?: "operativo" | "grants" | "rnd";
        utcHour?: number;
        weekday?: number;
        threshold?: number;
        currentApprovals?: number;
    }, {
        chainId?: number;
        fundKind?: "operativo" | "grants" | "rnd";
        utcHour?: number;
        weekday?: number;
        threshold?: number;
        currentApprovals?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    initiator?: {
        address?: string;
        role?: "CFO" | "FINANCE_OPS" | "GRANTS_LEAD" | "RND_LEAD" | "EXEC" | "VIEWER";
    };
    tx?: {
        safe?: string;
        to?: string;
        valueWei?: string;
        token?: string;
        data?: string;
        operation?: number;
    };
    context?: {
        chainId?: number;
        fundKind?: "operativo" | "grants" | "rnd";
        utcHour?: number;
        weekday?: number;
        threshold?: number;
        currentApprovals?: number;
    };
}, {
    initiator?: {
        address?: string;
        role?: "CFO" | "FINANCE_OPS" | "GRANTS_LEAD" | "RND_LEAD" | "EXEC" | "VIEWER";
    };
    tx?: {
        safe?: string;
        to?: string;
        valueWei?: string;
        token?: string;
        data?: string;
        operation?: number;
    };
    context?: {
        chainId?: number;
        fundKind?: "operativo" | "grants" | "rnd";
        utcHour?: number;
        weekday?: number;
        threshold?: number;
        currentApprovals?: number;
    };
}>;
export type PolicyInput = z.infer<typeof PolicyInput>;
export type PolicyDecision = {
    allow: boolean;
    reasons?: string[];
    requiredSigners?: number;
    maxAmountWei?: string | null;
};
