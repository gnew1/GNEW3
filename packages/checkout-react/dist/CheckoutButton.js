import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useCheckout } from "./useCheckout.js";
import { CheckoutModal } from "./CheckoutModal.js";
export function CheckoutButton(props) {
    const { state, start, selectAndPay } = useCheckout({ fiatBaseUrl: props.fiatBaseUrl });
    const [open, setOpen] = useState(false);
    const begin = async () => {
        setOpen(true);
        await start({
            side: props.side, fiat: props.fiat, crypto: props.crypto, amount: props.amount, walletAddress: props.walletAddress
        });
    };
    const label = props.label ?? (props.side === "buy" ? `Buy ${props.crypto}` : `Sell ${props.crypto}`);
    return (_jsxs(_Fragment, { children: [_jsx("button", { onClick: begin, style: btn, children: label }), state.stage === "select_quote" && (_jsx(CheckoutModal, { open: open, onClose: () => setOpen(false), quotes: state.quotes, onSelect: (p) => selectAndPay(p, {
                    side: props.side, fiat: props.fiat, crypto: props.crypto, amount: props.amount, walletAddress: props.walletAddress
                }) })), state.stage === "creating_order" && open && (_jsxs("div", { style: toast, children: ["Creando orden con ", state.provider, "\u2026"] })), state.stage === "done" && open && (_jsxs("div", { style: toast, children: ["Orden creada: ", state.orderId] })), state.stage === "error" && open && (_jsxs("div", { style: { ...toast, background: "#fee", color: "#900" }, children: ["Error: ", state.message] }))] }));
}
const btn = {
    padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd",
    background: "linear-gradient(#fff, #f6f6f6)", cursor: "pointer"
};
const toast = {
    position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
    background: "#111", color: "#fff", padding: "10px 14px", borderRadius: 12
};
