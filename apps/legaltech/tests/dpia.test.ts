
import { submitDPIA, listDPIA, approveDPIA } from "../src/dpia";

describe("DPIA", () => {
  it("should submit a new DPIA form", async () => {
    const rec = await submitDPIA({
      feature: "Payments Module",
      owner: "alice",
      risks: [{ category: "security_controls", score: 7, notes: "Need encryption at rest" }]
    });
    expect(rec.id).toBeDefined();
    expect(rec.approved).toBe(false);
  });

  it("should approve a DPIA", async () => {
    const list = await listDPIA();
    const first = list[0];
    await approveDPIA(first.id, "legal_officer");
    const updated = await listDPIA();
    expect(updated[0].approved).toBe(true);
  });
});


/apps/legaltech/package.json (fragmento)

{
  "scripts": {
    "dev:dpia": "ts-node src/dpia.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "pg": "^8.11.5",
    "uuid": "^9.0.1"
  }
}


