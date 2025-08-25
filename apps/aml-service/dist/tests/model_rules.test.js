import { scoreTx, explainTx } from "../src/engine/model";
import { checkRules } from "../src/engine/rules";
const model = {
    weights: { amount: 0.008, velocity: 0.5, crossBorder: 0.9, channelCrypto: 0.7, kycLow: 0.6, pep: 0.8, sanction: 3.0 },
    bias: -2.0,
    means: { amount: 100, velocity: 1, crossBorder: 0.1, channelCrypto: 0.1, kycLow: 0.1, pep: 0.05, sanction: 0 },
    stds: { amount: 200, velocity: 2, crossBorder: 0.3, channelCrypto: 0.3, kycLow: 0.3, pep: 0.2, sanction: 1 }
};
describe("model scoring & explain", () => {
    it("sanction dominates score", () => {
        const s1 = scoreTx({ amount: 50, velocity: 0, crossBorder: 0, channelCrypto: 0, kycLow: 0, pep: 0, sanction: 1 }, model);
        const s0 = scoreTx({ amount: 50, velocity: 0, crossBorder: 0, channelCrypto: 0, kycLow: 0, pep: 0, sanction: 0 }, model);
        expect(s1).toBeGreaterThan(0.9);
        expect(s0).toBeLessThan(0.5);
        const ex = explainTx({ amount: 1000, velocity: 3, crossBorder: 1, channelCrypto: 1, kycLow: 1, pep: 1, sanction: 1 }, model);
        expect(Object.keys(ex).length).toBeGreaterThan(3);
    });
    it("rules escalate on cross-border high amount", () => {
        const r = checkRules({ amount: 12000, channel: "bank", countryFrom: "ES", countryTo: "US", velocity: 1, sanctionHit: false });
        expect(r.escalateL2).toBe(true);
    });
});
