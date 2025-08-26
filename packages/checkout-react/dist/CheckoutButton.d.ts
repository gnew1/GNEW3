import type { Side } from "@gnew/checkout-sdk";
export declare function CheckoutButton(props: {
    fiatBaseUrl: string;
    side: Side;
    fiat: string;
    crypto: string;
    amount: number;
    walletAddress: string;
    label?: string;
}): import("react/jsx-runtime.js").JSX.Element;
