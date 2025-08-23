
import { useCallback, useMemo, useState } from "react";
import { FiatRampClient, Quote, QuoteReq } from "@gnew/checkout-sdk";

export type CheckoutState =
  | { stage: "idle" }
  | { stage: "loading_quotes" }
  | { stage: "select_quote"; quotes: Quote[] }
  | { stage: "creating_order"; provider: string }
  | { stage: "done"; orderId: string }
  | { stage: "error"; message: string };

export function useCheckout(opts: { fiatBaseUrl: string }) {
  const client = useMemo(() => new FiatRampClient({ baseUrl: opts.fiatBaseUrl }), [opts.fiatBaseUrl]);
  const [state, setState] = useState<CheckoutState>({ stage: "idle" });

  const start = useCallback(async (req: QuoteReq & { walletAddress: string }) => {
    try {
      setState({ stage: "loading_quotes" });
      const quotes = await client.getQuotes(req);
      if (!quotes.length) return setState({ stage: "error", message: "No quotes available" });
      setState({ stage: "select_quote", quotes });
    } catch (e: any) {
      setState({ stage: "error", message: e?.message ?? String(e) });
    }
  }, [client]);

  const selectAndPay = useCallback(async (provider: string, params: { side: "buy"|"sell"; fiat: string; crypto: string; amount: number; walletAddress: string; }) => {
    try {
      setState({ stage: "creating_order", provider });
      const { id } = await client.createOrder({ ...params, provider });
      setState({ stage: "done", orderId: id });
    } catch (e: any) {
      setState({ stage: "error", message: e?.message ?? String(e) });
    }
  }, [client]);

  return { state, start, selectAndPay };
}


