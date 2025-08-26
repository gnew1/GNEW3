import { describe, expect, it } from "vitest";
import { bnToString, ethToWei } from "../src/bignumber.js";

describe("BigNumberish helpers", () => {
  it("bnToString normalizes numbers", () => {
    expect(bnToString(1)).toBe("1");
    expect(bnToString("2")).toBe("2");
    expect(bnToString(3n)).toBe("3");
  });

  it("ethToWei converts to wei", () => {
    expect(ethToWei(1)).toBe("1000000000000000000");
    expect(ethToWei("2")).toBe("2000000000000000000");
  });
});
