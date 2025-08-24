export declare class Http {
    private baseUrl;
    private timeoutMs;
    constructor(baseUrl: string, timeoutMs?: number);
    get<T>(path: string, params?: Record<string, any>): Promise<T>;
    post<T>(path: string, body?: any, headers?: Record<string, string>): Promise<T>;
    static idemKey(prefix?: string): string;
}
