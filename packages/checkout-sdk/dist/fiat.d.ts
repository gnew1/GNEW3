import type { QuoteReq, Quote, CreateOrderParams, Order } from "./types.js";
export declare class FiatRampClient {
    private http;
    constructor(opts: {
        baseUrl: string;
        timeoutMs?: number;
    });
    getQuotes(req: QuoteReq): Promise<Quote[]>;
    createOrder(p: CreateOrderParams): Promise<{
        id: string;
        providerRef?: string;
    }>;
    getOrder(id: string): Promise<Order>;
}
