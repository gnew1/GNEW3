type XItem = {
    code: string;
    name: string;
    type: string;
    balance: string;
};
export declare function exportXBRLInstance(input: {
    entityId: string;
    periodYM: string;
    currency: string;
    items: XItem[];
}): string;
export {};
