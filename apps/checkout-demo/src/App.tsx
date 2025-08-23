
import React, { useState } from "react";
import { CheckoutButton } from "@gnew/checkout-react";

export function App() {
  const [wallet, setWallet] = useState("0xYourWalletAddressHere");
  return (
    <div style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1>GNEW Checkout Demo</h1>
      <label>Wallet:&nbsp;
        <input value={wallet} onChange={(e) => setWallet(e.target.value)} style={{ padding: 6, borderRadius: 8, border: "1px solid #ddd" }} />
      </label>
      <div style={{ height: 12 }} />
      <CheckoutButton
        fiatBaseUrl="http://localhost:8081"
        side="buy"
        fiat="EUR"
        crypto="USDC"
        amount={150}
        walletAddress={wallet}
        label="Comprar USDC"
      />
    </div>
  );
}

Notas de integración (alineado con módulos previos)

El SDK consume los endpoints ya entregados:

/apps/payments/fiat-onofframp → /quotes, /orders/:id.

/apps/payments/subscriptions-api → /plans, /subscriptions.

El paquete React es opcional y no introduce dependencias de UI externas.

Para idempotencia en órdenes, el SDK genera idempotencyKey si no se provee.

Próximo turno automático: N156 (avanzando +1).

Tú dijiste:
Ejecuta y entrégame, como IA programadora, el siguiente prompt N de "N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt", empezando en N151 y avanzando +1 en cada ejecución. No repitas prompts ya entregados. Devuelve código completo con rutas coherentes con el monorepo y alineado con el stack indicado en cada prompt.
ChatGPT Plus
Pensó durante 1m 9s

