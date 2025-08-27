
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

