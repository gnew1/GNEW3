
import { computeInvoice } from "../src/engine.js";
import { InvoiceInput } from "../src/models.js";

test("ES IVA 21% + IRPF 15% (profesional)", () => {
  const inv: InvoiceInput = {
    country: "ES",
    currency: "EUR",
    series: { country: "ES", year: 2025, code: "A" },
    supplier: { name: "GNEW SA", taxId: "ESB00000000" },
    customer: { id: "PRO123456" },
    lines: [
      { description: "Servicio", qty: 1, unitPrice: 100, taxCode: "ES:IVA21" }
    ]
  };
  const r = computeInvoice(inv);
  expect(r.subtotal).toBe(100.00);
  expect(r.taxTotal).toBe(21.00);
  expect(r.withholdingTotal).toBe(15.00);
  expect(r.total).toBe(106.00);
});


