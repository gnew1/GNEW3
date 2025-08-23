
import crypto from "node:crypto";
import { cfg } from "../config.js";
import { QuoteReq, Quote, Order } from "../models.js";
import { RampProvider } from "./base.js";

/**
 * Proveedor de ejemplo (tarjetas/SEPA) con firma HMAC en webhooks.
 * Precio simulado con spreads y fees parametrizados.
 */
export class MockProvider implements RampProvider {
  name() { return "mock"; }

  async quote(req: QuoteReq): Promise<Quote | null> {
    const basePrice = this.getBasePrice(req.crypto, req.fiat); // fiat por 1 crypto
    const spread = 0.006; // 0.6%
    const feePct = req.side === "buy" ? 0.012 : 0.008;
    const feeFixed = req.side === "buy" ? 1.2 : 1.0;
    const price = basePrice * (1 + (req.side === "buy" ? spread : -spread));
    const amountInFiat = req.amount; // simplificado: buy expresa amount en fiat
    const totalFees = feeFixed + amountInFiat * feePct;
    const totalToPay = req.side === "buy" ? amountInFiat + totalFees : Math.max(0, amountInFiat - totalFees);

    return {
      provider: this.name(),
      side: req.side,
      fiat: req.fiat,
      crypto: req.crypto,
      amountInFiat,
      price,
      feeFixed,
      feePct,
      etaMinutes: req.side === "buy" ? 8 : 45,
      kycRequired: amountInFiat > 150, // umbral simple
      totalFees,
      totalToPay,
      note: "price=fiat/crypto (buy); fees incluyen red y proveedor"
    };
  }

  async createOrder(o: { req: QuoteReq & { walletAddress: string; idempotencyKey: string } }): Promise<{ order: Partial<Order> & { providerRef: string } }> {
    return {
      order: {
        providerRef: "mock_" + crypto.randomUUID(),
        status: "pending"
      }
    };
  }

  async verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): Promise<boolean> {
    const sig = (headers["x-mock-signature"] as string | undefined) ?? "";
    const ts = (headers["x-mock-timestamp"] as string | undefined) ?? "";
    const tolerance = cfg.webhookToleranceSec;
    const skewOk = Math.abs(Date.now() / 1000 - Number(ts)) <= tolerance;
    if (!skewOk) return false;

    const secrets = cfg.providers.mock.webhookSecrets;
    for (const s of secrets) {
      const [, secret] = String(s).split("=");
      const mac = crypto.createHmac("sha256", secret).update(ts + "." + rawBody).digest("hex");
      if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from("v1=" + mac))) return true;
    }
    return false;
  }

  parseWebhook(body: any): { providerRef: string; status: Order["status"] } | null {
    if (!body || !body.ref || !body.status) return null;
    const map: Record<string, Order["status"]> = {
      created: "created",
      pending: "pending",
      processing: "processing",
      completed: "completed",
      failed: "failed",
      canceled: "canceled"
    };
    const status = map[String(body.status)] ?? null;
    if (!status) return null;
    return { providerRef: String(body.ref), status };
  }

  private getBasePrice(crypto: string, fiat: string): number {
    // precios ficticios estáticos (solo para demo)
    const p: Record<string, number> = { USDC: 1, BTC: 65000, ETH: 3000 };
    const fx: Record<string, number> = { EUR: 1.0, USD: 1.1 };
    return (p[crypto] ?? 100) * (fx[fiat] ?? 1);
  }
}


