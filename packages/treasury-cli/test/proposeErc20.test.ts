import { describe, expect, it } from "vitest";
import { buildErc20PolicyInput, Erc20Args, ERC20_ABI } from "../src/proposeErc20.js";
import { ethers } from "ethers";

const meta = {
  chainId: 1,
  fundKind: "operativo" as const,
  threshold: 1,
  approvals: 0,
  initiator: "0xInitiator",
  now: new Date("2024-01-01T00:00:00Z"),
};

describe("buildErc20PolicyInput", () => {
  it("creates policy input and encodes data", () => {
    const args: Erc20Args = {
      safe: "0xSaFe",
      token: "0xToken",
      to: "0xRecipient",
      amount: "5",
      role: "CFO",
    };
    const { input, data } = buildErc20PolicyInput(args, meta);
    const iface = new ethers.Interface(ERC20_ABI);
    expect(data).toBe(
      iface.encodeFunctionData("transfer", ["0xRecipient", "5"])
    );
    expect(input.tx.token).toBe("0xtoken");
    expect(input.tx.to).toBe("0xtoken");
    expect(input.initiator.role).toBe("CFO");
  });
});
