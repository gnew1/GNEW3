type TxCtx = {
    amount: number;
    channel: "card" | "bank" | "crypto" | "cash" | "p2p";
    countryFrom?: string;
    countryTo?: string;
    velocity: number;
    sanctionHit: boolean;
};
export declare function checkRules(tx: TxCtx): {
    hits: string[];
    flag: boolean;
    escalateL2: boolean;
};
export {};
