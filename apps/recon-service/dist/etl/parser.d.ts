export type NormalizedRow = {
    ext_id: string;
    amount: number;
    currency: string;
    timestamp: string;
    memo?: string;
    external_ref?: string;
};
export declare function parseCsvOrJson(input: {
    format: "csv" | "json";
    data: string | Array<Record<string, any>>;
    csv?: {
        delimiter?: string;
        headers: {
            id: string;
            amount: string;
            timestamp: string;
            currency?: string;
            memo?: string;
            external_ref?: string;
        };
    };
    defaultCurrency?: string;
    tz?: string;
}): NormalizedRow[];
