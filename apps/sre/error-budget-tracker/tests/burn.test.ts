
import { analyze } from "../src/burn.js";
import { AnalysisInput, EventRow } from "../src/models.js";

function genEvents(pGood: number, total: number, start: Date, periodMs: number): EventRow[] {
  const rows: EventRow[] = [];
  for (let i = 0; i < total; i++) {
    rows.push({
      ts: new Date(start.getTime() + i * periodMs),
      success: Math.random() < pGood
    });
  }
  return rows;
}

describe("burn-rate", () => {
  test("computes higher burn with more errors", () => {
    const now = new Date();
    const base: Omit<AnalysisInput, "events"> = {
      sli: "availability",
      slo: 99.9,
      budgetWindowDays: 28,
      windows: [{ name: "5m", ms: 5 * 60_000 }, { name: "1h", ms: 60 * 60_000 }]
    };

    const good = analyze({ ...base, events: genEvents(0.999, 10_000, new Date(now.getTime() - 2 * 60 * 60_000), 1000) }, now);
    const bad  = analyze({ ...base, events: genEvents(0.95,  10_000, new Date(now.getTime() - 2 * 60 * 60_000), 1000) }, now);

    expect(bad.windows[0].burnRate).toBeGreaterThan(good.windows[0].burnRate);
    expect(bad.windows[1].burnRate).toBeGreaterThan(good.windows[1].burnRate);
  });
});


