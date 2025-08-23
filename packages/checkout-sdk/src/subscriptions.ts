
import { Http } from "./http.js";
import type {
  CreatePlanParams, Plan,
  CreateSubscriptionParams, Subscription
} from "./types.js";

export class SubscriptionsClient {
  private http: Http;
  constructor(opts: { baseUrl: string; timeoutMs?: number }) {
    this.http = new Http(opts.baseUrl, opts.timeoutMs);
  }

  async createPlan(p: CreatePlanParams): Promise<Plan> {
    return this.http.post<Plan>("/plans", p);
  }

  async createSubscription(p: CreateSubscriptionParams): Promise<{ id: string; nextChargeAt: number; graceEndsAt: number }> {
    return this.http.post(`/subscriptions`, p);
  }

  async cancelSubscription(id: string): Promise<{ ok: true }> {
    return this.http.post(`/subscriptions/${id}/cancel`, {});
  }

  async listDue(): Promise<{ due: any[] }> {
    return this.http.get(`/subscriptions/due`);
  }
}


