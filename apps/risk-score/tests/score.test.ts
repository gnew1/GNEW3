
import { scoreCounterparty } from "../src/service/score";

describe("scoreCounterparty", () => {
  it("penalizes PEP and sanctions", () => {
    const result = scoreCounterparty({
      kyc: { country: "ES", pep: true, sanctionsHit: true },
      behavior: { txVolume: 5000, disputes: 1, chargebacks: 0 },
      liquidity: { assets: 100, liabilities: 200 },
    });
    expect(result.score).toBeLessThan(50);
    expect(result.bucket).toBe("HIGH");
  });

  it("rewards good liquidity", () => {
    const result = scoreCounterparty({
      kyc: { country: "FR", pep: false, sanctionsHit: false },
      behavior: { txVolume: 2_000_000, disputes: 0, chargebacks: 0 },
      liquidity: { assets: 1000, liabilities: 100 },
    });
    expect(result.score).toBeGreaterThan(80);
    expect(result.bucket).toBe("LOW");
  });
});


