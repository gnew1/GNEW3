export declare function metrics(): {
    failRate: number;
    attempts: number;
    success: number;
    failed: number;
    lastError: string;
};
export declare function forceCharge(subId: bigint): Promise<{
    ok: boolean;
    txHash: string;
    subId: string;
    error?: undefined;
} | {
    ok: boolean;
    error: string;
    txHash?: undefined;
    subId?: undefined;
}>;
export declare function chargeDueBatch(): Promise<void>;
