
import { db } from "../src/db.js";
import { scoreFor } from "../src/heuristics.js";

beforeAll(() => {
  // denylist de una address
  db.prepare("INSERT INTO lists(id,list,address,updatedAt) VALUES('l1','deny','0xdenied',?)").run(Date.now());
});

test("deny/sanctions/revoked empujan a bloqueo", () => {
  const s1 = scoreFor("0xdenied", { txVelocity1h: 0 });
  expect(s1.decision).toBe("block");
  expect(s1.score).toBeGreaterThanOrEqual(0.5);
});

test("wallet joven y velocidad moderada → warn", () => {
  const now = Date.now();
  const s2 = scoreFor("0xyoung", { firstSeenAt: now - 3*24*3600*1000, txVelocity1h: 10, amountMinorRecent: 0 });
  expect(["warn","block"]).toContain(s2.decision);
});


