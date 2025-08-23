
import { MockProvider } from "../src/providers/mock.js";

test("fees increase with amount", async () => {
  const p = new MockProvider();
  const small = await p.quote({ side: "buy", fiat: "EUR", crypto: "USDC", amount: 10 });
  const big = await p.quote({ side: "buy", fiat: "EUR", crypto: "USDC", amount: 1000 });
  expect(small && big && big.totalFees).toBeGreaterThan(small!.totalFees);
});


