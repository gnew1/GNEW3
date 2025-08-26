
/**
 * GNEW · N328 — Portal de pagos para terceros (Checkout SDK)
 * Rol: SDK + Sec
 * Objetivo: Cobros embebibles GNEW/fiat seguros.
 * Stack: Web Components, CSP, webhook firmado.
 * Entregables: SDK NPM + ejemplos.
 * Pasos: Tokenización; intents firmados.
 * Pruebas/DoD: “Hello-checkout” < 10 min.
 * Seguridad & Observabilidad: PCI-like; rate limit.
 * Despliegue: Beta cerrada.
 */

import { createCheckoutFrame } from "./ui/CheckoutFrame";
import { signIntent, verifyWebhook } from "./utils/crypto";
import type { CheckoutIntent, CheckoutOptions } from "./types";

export class GnewCheckout {
  private readonly apiBase: string;
  constructor(apiBase: string) {
    this.apiBase = apiBase;
  }

  async init(container: HTMLElement, opts: CheckoutOptions) {
    const iframe = createCheckoutFrame(this.apiBase, opts);
    container.appendChild(iframe);
  }

  async createIntent(intent: CheckoutIntent, apiKey: string) {
    const signed = await signIntent(intent, apiKey);
    const res = await fetch(`${this.apiBase}/checkout/intents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signed),
    });
    if (!res.ok) throw new Error(`Intent failed: ${res.status}`);
    return res.json();
  }

  static verifyWebhook(sig: string, payload: any, pubKey: string) {
    return verifyWebhook(sig, payload, pubKey);
  }
}

export * from "./types";


