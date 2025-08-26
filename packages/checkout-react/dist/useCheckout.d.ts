import { Quote, QuoteReq } from "@gnew/checkout-sdk";
export type CheckoutState = {
    stage: "idle";
} | {
    stage: "loading_quotes";
} | {
    stage: "select_quote";
    quotes: Quote[];
} | {
    stage: "creating_order";
    provider: string;
} | {
    stage: "done";
    orderId: string;
} | {
    stage: "error";
    message: string;
};
export declare function useCheckout(opts: {
    fiatBaseUrl: string;
}): {
    state: CheckoutState;
    start: (req: QuoteReq & {
        walletAddress: string;
    }) => Promise<void>;
    selectAndPay: (provider: string, params: {
        side: "buy" | "sell";
        fiat: string;
        crypto: string;
        amount: number;
        walletAddress: string;
    }) => Promise<void>;
};
