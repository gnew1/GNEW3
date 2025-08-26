import { PriceEngine } from "../src/engine/engine";
import { RulesStore } from "../src/store/rules";
import { AuditStore } from "../src/store/audit";
describe("engine performance and determinism", () => {
    const engine = new PriceEngine(new RulesStore(new AuditStore()));
    it("applies rules deterministically and fast", async () => {
        const N = 300;
        const t0 = process.hrtime.bigint();
        let sum = 0;
        for (let i = 0; i < N; i++) {
            const r = await engine.quote({
                sku: "SKU-FAST",
                basePrice: 123.45,
                currency: "EUR",
                userId: "u-fast",
                segment: "new",
                riskScore: 0.1,
                quantity: 1,
            });
            sum += r.finalPrice;
        }
        const t1 = process.hrtime.bigint();
        const avgMs = Number(t1 - t0) / 1e6 / N;
        expect(avgMs).toBeLessThan(5); // muy por debajo de 50ms de DoD
        expect(sum / N).toBeCloseTo(117.28, 2); // 5% de 123.45 → 117.28
    });
});
