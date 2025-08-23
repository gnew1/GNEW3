
import React from "react";
import type { Quote } from "@gnew/checkout-sdk";

export function CheckoutModal(props: {
  open: boolean;
  onClose: () => void;
  quotes: Quote[];
  onSelect: (provider: string) => void;
}) {
  if (!props.open) return null;
  return (
    <div style={backdrop}>
      <div style={modal}>
        <div style={header}>
          <strong>GNEW Checkout</strong>
          <button style={closeBtn} onClick={props.onClose} aria-label="Close">×</button>
        </div>
        <div style={{ padding: 12, display: "grid", gap: 8 }}>
          {props.quotes.map((q) => (
            <button key={`${q.provider}-${q.totalFees}`} style={item} onClick={() => props.onSelect(q.provider)}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span>{q.provider.toUpperCase()}</span>
                <span>{q.fiat} {q.totalToPay.toFixed(2)}</span>
              </div>
              <small style={{ opacity: 0.7 }}>
                fee {Math.round(q.feePct*100)}% + {q.feeFixed.toFixed(2)} | ~{q.etaMinutes} min
              </small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
  display: "grid", placeItems: "center", zIndex: 50
};
const modal: React.CSSProperties = {
  width: "min(420px, 92vw)", background: "#fff", color: "#111",
  borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.2)"
};
const header: React.CSSProperties = {
  padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center"
};
const closeBtn: React.CSSProperties = {
  border: "none", background: "transparent", fontSize: 24, lineHeight: 1, cursor: "pointer"
};
const item: React.CSSProperties = {
  padding: 12, borderRadius: 12, border: "1px solid #eee", background: "#fafafa", textAlign: "left", cursor: "pointer"
};


