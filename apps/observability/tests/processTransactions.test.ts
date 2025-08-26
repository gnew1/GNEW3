import { beforeEach, expect, test, vi } from "vitest";

process.env.RPC_URL = "http://localhost:8545";
process.env.CHAIN_ID = "1";
process.env.CONTRACTS = "GnewToken:0x1111111111111111111111111111111111111111";

const mod = await import("../src/index");
const { processTransactions, cTxTotal, cTxFailed } = mod;

beforeEach(() => {
  cTxTotal.reset();
  cTxFailed.reset();
});

test("processTransactions updates metrics", async () => {
  const fakeProvider = {
    getBlock: vi.fn().mockResolvedValue({
      transactions: [
        { to: "0x1111111111111111111111111111111111111111", hash: "0x1" },
        { to: "0x2222222222222222222222222222222222222222", hash: "0x2" }
      ]
    }),
    getTransactionReceipt: vi.fn()
      .mockResolvedValueOnce({ status: 0 })
      .mockResolvedValue({ status: 1 })
  } as any;

  await processTransactions(1, 1, fakeProvider);

  const total = cTxTotal.get().values.find((v: any) => v.labels.contract === "GnewToken")?.value ?? 0;
  const failed = cTxFailed.get().values.find((v: any) => v.labels.contract === "GnewToken")?.value ?? 0;
  expect(total).toBe(1);
  expect(failed).toBe(1);
});
