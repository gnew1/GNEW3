import { Http } from "./http.js";
export class SubscriptionsClient {
    http;
    constructor(opts) {
        this.http = new Http(opts.baseUrl, opts.timeoutMs);
    }
    async createPlan(p) {
        return this.http.post("/plans", p);
    }
    async createSubscription(p) {
        return this.http.post(`/subscriptions`, p);
    }
    async cancelSubscription(id) {
        return this.http.post(`/subscriptions/${id}/cancel`, {});
    }
    async listDue() {
        return this.http.get(`/subscriptions/due`);
    }
}
