
import { calculateTaxes, CalcInput } from "../src/engine/calc";

describe("calculateTaxes", () => {
  it("computes VAT correctly", () => {
    const input = {
      jurisdiction: "EU",
      seller: { country: "ES" },
      buyer: { country: "FR", b2b: false },
      items: [{ sku: "A1", price: 100, qty: 1 }],
      currency: "EUR",
    };
    const rules = {
      rules: [
        {
          id: "vat_eu",
          when: { destination: "FR", b2b: false },
          outcome: { vatRate: 0.21 },
        },
      ],
    };
    const rates = {};
    const result = calculateTaxes(input as any, rules, rates);
    expect(result.subtotal).toBe(100);
    expect(result.totalTax).toBeCloseTo(21);
    expect(result.grandTotal).toBeCloseTo(121);
  });
});


/apps/tax-engine/package.json (fragment de integración test)

{
  "scripts": {
    "test": "jest --passWithNoTests"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.12",
    "ts-jest": "^29.1.2"
  }
}


