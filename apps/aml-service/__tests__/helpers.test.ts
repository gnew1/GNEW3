import { computeScore, determineLevel, statusFromAction, determineAction, buildFeatures } from "../src/app";

const model = {
  weights: { amount: 0.1 },
  bias: 0,
  means: { amount: 0 },
  stds: { amount: 1 },
  thresholdL1: 0.5,
  thresholdL2: 0.8,
  mode: "shadow",
} as any;

describe("pure helpers", () => {
  it("computeScore fallback", () => {
    expect(computeScore(null, { amount: 10 }, false, 10)).toBeGreaterThan(0.2);
    expect(computeScore(null, { amount: 10 }, true, 10)).toBe(0.99);
    expect(computeScore(model, { amount: 10 }, false, 10)).toBeCloseTo(0.73, 2);
  });

  it("determineLevel", () => {
    expect(determineLevel(0.9, { flag: false, escalateL2: false }, 0.5, 0.8, false)).toBe("L2");
    expect(determineLevel(0.6, { flag: true, escalateL2: false }, 0.5, 0.8, false)).toBe("L1");
    expect(determineLevel(0.3, { flag: false, escalateL2: false }, 0.5, 0.8, false)).toBe("none");
  });

  it("statusFromAction", () => {
    expect(statusFromAction("escalate")).toBe("l2_review");
    expect(statusFromAction("close")).toBe("closed");
    expect(statusFromAction("whatever")).toBe("ack");
  });

  it("determineAction", () => {
    expect(determineAction("enforced", "L2")).toBe("block");
    expect(determineAction("shadow", "L2")).toBe("allow");
  });

  it("buildFeatures", () => {
    const body: any = { amount: 5, countryFrom: "ES", countryTo: "US", channel: "crypto", kycLevel: "low", pepFlag: true };
    const f = buildFeatures(body, 2, true);
    expect(f.crossBorder).toBe(1);
    expect(f.channelCrypto).toBe(1);
    expect(f.kycLow).toBe(1);
    expect(f.pep).toBe(1);
    expect(f.sanction).toBe(1);
  });
});
