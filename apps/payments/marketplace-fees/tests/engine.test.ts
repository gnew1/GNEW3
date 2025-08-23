
import { computeSplit } from "../src/engine.js";
import { db } from "../src/db.js";

// Inserta reglas mínimas para el test
beforeAll(() => {
  db.prepare("DELETE FROM fee_rules").run();
  db.prepare("DELETE FROM partners").run();
  db.prepare("INSERT INTO partners(id,name,defaultFeePct,withholdingPct,createdAt) VALUES('p1','Partner 1',25000,15000,?)").run(Date.now());
  db.prepare("INSERT INTO fee_rules(id,scope,currency,feePct,minFee,capFee,createdAt) VALUES('r1','global','EUR',30000,50,999999999,?)").run(Date.now());
});

test("calcula split con fee 3% y withholding 1.5%", () => {
  const res = computeSplit({
    partnerId: "p1",
    currency: "EUR",
    netMinor: 10000,        // 100,00 €
    category: null,
    withholdingPctPpm: 15000 // 1.5%
  });
  // fee 3% = 300
  expect(res.platform).toBe(300);
  // partnerGross = 9700
  expect(res.partnerGross).toBe(9700);
  // withholding 1.5% de 9700 = 145.5 -> 146 (half-up)
  expect(res.withholding).toBe(146);
  // net = 9554
  expect(res.partnerNet).toBe(9554);
});


