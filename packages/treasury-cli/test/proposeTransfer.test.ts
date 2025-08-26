import { describe, expect, it } from "vitest";
import { buildTransferPolicyInput, TransferArgs } from "../src/proposeTransfer.js";

const meta = {
  chainId: 1,
  fundKind: "operativo" as const,
  threshold: 2,
  approvals: 1,
  initiator: "0xInitiator",
  now: new Date("2024-01-01T00:00:00Z"),
};

describe("buildTransferPolicyInput", () => {
  it("creates policy input", () => {
    const args: TransferArgs = {
      safe: "0xSaFe",
      to: "0xTo",
      amountEth: 1,
      note: "",
      role: "CFO",
    };
    const input = buildTransferPolicyInput(args, meta);
    expect(input.tx.valueWei).toBe("1000000000000000000");
    expect(input.tx.safe).toBe("0xsafe");
    expect(input.tx.to).toBe("0xto");
    expect(input.context.chainId).toBe(1);
    expect(input.initiator.role).toBe("CFO");
  });
});
