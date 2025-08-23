
import { QuoteReq, Quote, Order } from "../models.js";

export interface RampProvider {
  name(): string;
  quote(req: QuoteReq): Promise<Quote | null>;
  createOrder(o: {
    req: QuoteReq & { walletAddress: string; idempotencyKey: string };
  }): Promise<{ order: Partial<Order> & { providerRef: string } }>;
  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): Promise<boolean>;
  parseWebhook(body: any): { providerRef: string; status: Order["status"] } | null;
}


