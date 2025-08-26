import type { Quote } from "@gnew/checkout-sdk";
export declare function CheckoutModal(props: {
    open: boolean;
    onClose: () => void;
    quotes: Quote[];
    onSelect: (provider: string) => void;
}): import("react/jsx-runtime").JSX.Element | null;
