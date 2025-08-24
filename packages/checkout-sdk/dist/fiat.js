import { Http } from "./http.js";
export class FiatRampClient {
    http;
    constructor(opts) {
        this.http = new Http(opts.baseUrl, opts.timeoutMs);
    }
    async getQuotes(req) {
        const { quotes } = await this.http.get("/quotes", req);
        return quotes;
    }
    async createOrder(p) {
        const payload = {
            ...p,
            idempotencyKey: p.idempotencyKey ?? Http.idemKey("checkout")
        };
        return this.http.post("/orders", payload).then(r => ({
            id: r.id, providerRef: r.providerRef
        }));
    }
    async getOrder(id) {
        return this.http.get(`/orders/${id}`);
    }
}
