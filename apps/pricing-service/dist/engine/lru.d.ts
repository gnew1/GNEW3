export declare class LRU<K, V> {
    private max;
    private ttlMs;
    private map;
    constructor(max?: number, ttlMs?: number);
    get(key: K): V | undefined;
    set(key: K, val: V): void;
    clear(): void;
}
