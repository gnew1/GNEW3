import { useCallback, useMemo, useState } from "react";
import { FiatRampClient } from "@gnew/checkout-sdk";
export function useCheckout(opts) {
    const client = useMemo(() => new FiatRampClient({ baseUrl: opts.fiatBaseUrl }), [opts.fiatBaseUrl]);
    const [state, setState] = useState({ stage: "idle" });
    const start = useCallback(async (req) => {
        try {
            setState({ stage: "loading_quotes" });
            const quotes = await client.getQuotes(req);
            if (!quotes.length)
                return setState({ stage: "error", message: "No quotes available" });
            setState({ stage: "select_quote", quotes });
        }
        catch (e) {
            setState({ stage: "error", message: e?.message ?? String(e) });
        }
    }, [client]);
    const selectAndPay = useCallback(async (provider, params) => {
        try {
            setState({ stage: "creating_order", provider });
            const { id } = await client.createOrder({ ...params, provider });
            setState({ stage: "done", orderId: id });
        }
        catch (e) {
            setState({ stage: "error", message: e?.message ?? String(e) });
        }
    }, [client]);
    return { state, start, selectAndPay };
}
