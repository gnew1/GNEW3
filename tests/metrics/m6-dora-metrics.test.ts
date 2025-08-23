
import { collectMetrics } from "../../ops/metrics/m6-dora-metrics";

describe("M6 DORA Metrics", () => {
  it("retorna un objeto con las 4 métricas", () => {
    const metrics = collectMetrics();
    expect(metrics).toHaveProperty("deploymentFrequency");
    expect(metrics).toHaveProperty("leadTimeForChanges");
    expect(metrics).toHaveProperty("changeFailureRate");
    expect(metrics).toHaveProperty("meanTimeToRecovery");
  });
});


