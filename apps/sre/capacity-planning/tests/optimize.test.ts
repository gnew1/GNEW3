import { optimizeReservation } from "../src/optimize.js";
import { ForecastPoint } from "../src/models.js";

describe("optimizeReservation", () => {
  test("prefiere reservar base estable", () => {
    const forecast: ForecastPoint[] = [
      { period: "2025-09", usage: 1000 },
      { period: "2025-10", usage: 1050 },
      { period: "2025-11", usage: 1100 }
    ];
    const pricing = { unit: "vCPUh", onDemandRate: 0.05, reservedRate: 0.03, granularity: 50 };

    const res = optimizeReservation(forecast, pricing as any);
    expect(res.commit).toBeGreaterThan(0);
    expect(res.cost).toBeLessThan(res.baseline);
    expect(res.savings).toBeGreaterThan(0);
  });
});

