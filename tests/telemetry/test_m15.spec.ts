
import { expect } from "chai";
import { TelemetryCollector } from "../../services/telemetry/collector";

describe("M15 TelemetryCollector", () => {
  it("debería registrar un evento offchain", () => {
    const collector = new TelemetryCollector("test-service");
    const traceId = collector.log("test-event", { foo: "bar" });
    expect(traceId).to.be.a("string");
  });

  it("debería exportar eventos a JSON", () => {
    const collector = new TelemetryCollector("test-service");
    collector.log("test-event", { foo: "bar" });
    collector.exportAll("telemetry-test.json");
  });
});


