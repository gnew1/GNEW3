
import { runAuditChecks } from "../src/service/audit";

describe("runAuditChecks", () => {
  it("flags mismatches above tolerance", async () => {
    const report = await runAuditChecks();
    expect(report.findings.length).toBeGreaterThanOrEqual(1);
    expect(report.status).toMatch(/PASSED|FAILED/);
  });
});


