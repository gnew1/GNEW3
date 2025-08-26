export declare function backOff<T>(fn: () => Promise<T>, cfg?: {
    retries: number;
    baseMs?: number;
}): Promise<T>;
