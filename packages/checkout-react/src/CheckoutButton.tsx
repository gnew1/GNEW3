
import React, { useMemo, useState } from "react";
import { useCheckout } from "./useCheckout.js";
import type { Side } from "@gnew/checkout-sdk";
import { CheckoutModal } from "./CheckoutModal.js";

export function CheckoutButton(props: {
  fiatBaseUrl: string;
  side: Side;
  fiat: string;
  crypto: string;
  amount: number;
  walletAddress: string;
  label?: string;
}) {
  const { state, start, selectAndPay } = useCheckout({ fiatBaseUrl: props.fiatBaseUrl });
  const [open, setOpen] = useState(false);

  const begin = async () => {
    setOpen(true);
    await start({
      side: props.side, fiat: props.fiat, crypto: props.crypto, amount: props.amount, walletAddress: props.walletAddress
    });
  };

  const label = props.label ?? (props.side === "buy" ? `Buy ${props.crypto}` : `Sell ${props.crypto}`);

  return (
    <>
      <button onClick={begin} style={btn}>{label}</button>
      {state.stage === "select_quote" && (
        <CheckoutModal
          open={open}
          onClose={() => setOpen(false)}
          quotes={state.quotes}
          onSelect={(p) => selectAndPay(p, {
            side: props.side, fiat: props.fiat, crypto: props.crypto, amount: props.amount, walletAddress: props.walletAddress
          })}
        />
      )}
      {state.stage === "creating_order" && open && (
        <div style={toast}>Creando orden con {state.provider}…</div>
      )}
      {state.stage === "done" && open && (
        <div style={toast}>Orden creada: {state.orderId}</div>
      )}
      {state.stage === "error" && open && (
        <div style={{ ...toast, background: "#fee", color: "#900" }}>Error: {state.message}</div>
      )}
    </>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd",
  background: "linear-gradient(#fff, #f6f6f6)", cursor: "pointer"
};
const toast: React.CSSProperties = {
  position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
  background: "#111", color: "#fff", padding: "10px 14px", borderRadius: 12
};


