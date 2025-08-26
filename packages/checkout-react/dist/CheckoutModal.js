import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function CheckoutModal(props) {
    if (!props.open)
        return null;
    return (_jsx("div", { style: backdrop, children: _jsxs("div", { style: modal, children: [_jsxs("div", { style: header, children: [_jsx("strong", { children: "GNEW Checkout" }), _jsx("button", { style: closeBtn, onClick: props.onClose, "aria-label": "Close", children: "\u00D7" })] }), _jsx("div", { style: { padding: 12, display: "grid", gap: 8 }, children: props.quotes.map((q) => (_jsxs("button", { style: item, onClick: () => props.onSelect(q.provider), children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", width: "100%" }, children: [_jsx("span", { children: q.provider.toUpperCase() }), _jsxs("span", { children: [q.fiat, " ", q.totalToPay.toFixed(2)] })] }), _jsxs("small", { style: { opacity: 0.7 }, children: ["fee ", Math.round(q.feePct * 100), "% + ", q.feeFixed.toFixed(2), " | ~", q.etaMinutes, " min"] })] }, `${q.provider}-${q.totalFees}`))) })] }) }));
}
const backdrop = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
    display: "grid", placeItems: "center", zIndex: 50
};
const modal = {
    width: "min(420px, 92vw)", background: "#fff", color: "#111",
    borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.2)"
};
const header = {
    padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center"
};
const closeBtn = {
    border: "none", background: "transparent", fontSize: 24, lineHeight: 1, cursor: "pointer"
};
const item = {
    padding: 12, borderRadius: 12, border: "1px solid #eee", background: "#fafafa", textAlign: "left", cursor: "pointer"
};
