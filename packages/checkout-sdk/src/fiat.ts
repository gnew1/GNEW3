
import { Http } from "./http.js";
import type { QuoteReq, Quote, CreateOrderParams, Order } from "./types.js";

export class FiatRampClient {
  private http: Http;
  constructor(opts: { baseUrl: string; timeoutMs?: number }) {
    this.http = new Http(opts.baseUrl, opts.timeoutMs);
  }

  async getQuotes(req: QuoteReq): Promise<Quote[]> {
    const { quotes } = await this.http.get<{ quotes: Quote[] }>("/quotes", req as any);
    return quotes;
  }

  async createOrder(p: CreateOrderParams): Promise<{ id: string; providerRef?: string }> {
    const payload = {
      ...p,
      idempotencyKey: p.idempotencyKey ?? Http.idemKey("checkout")
    };
    return this.http.post<{ ok: true; id: string; providerRef?: string }>("/orders", payload).then(r => ({
      id: r.id, providerRef: r.providerRef
    }));
  }

  async getOrder(id: string): Promise<Order> {
    return this.http.get<Order>(`/orders/${id}`);
  }
}


