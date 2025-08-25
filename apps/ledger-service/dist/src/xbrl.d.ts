type Fact = {
    concept: string;
    accountCode: string;
    accountName: string;
    currency: string;
    value: number;
};
export declare function createXbrlInstance(input: {
    entityId: string;
    periodStart: string;
    periodEnd: string;
    facts: Fact[];
}): string;
export {};
