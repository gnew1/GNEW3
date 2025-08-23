
import { InvoiceInput, InvoiceComputed, LineInput, TaxLine } from "./models.js";
import { rulesRegistry } from "./rules/index.js";

export function computeInvoice(input: InvoiceInput): InvoiceComputed {
  const rules = rulesRegistry[input.country];
  if (!rules) throw new Error(`No hay reglas para país ${input.country}`);

  const ctx = {
    currency: input.currency,
    supplierCountry: input.series.country,
    customerCountry: input.country,
    customerTaxId: getCustomerTaxIdMask(input.customer.id) // se sustituye por real en API
  };

  let subtotal = 0;
  const taxes: TaxLine[] = [];
  for (const l of input.lines) {
    const base = +(l.qty * l.unitPrice).toFixed(2);
    subtotal += base;
    const t = rules.taxForLine(l, ctx as any);
    taxes.push(t);
  }
  const groupedTaxes = groupByCode(taxes);

  let withholdings: TaxLine[] = [];
  if (rules.withholdingsForInvoice) {
    withholdings = rules.withholdingsForInvoice({
      ...ctx,
      customerTaxId: ctx.customerTaxId
    }) ?? [];
    // completar base de retención = subtotal
    withholdings = withholdings.map(w => ({ ...w, base: subtotal, amount: +(subtotal * w.rate).toFixed(2) }));
  }

  const taxTotal = +(groupedTaxes.reduce((a, b) => a + b.amount, 0).toFixed(2));
  const withholdingTotal = +(withholdings.reduce((a, b) => a + b.amount, 0).toFixed(2));
  const total = +(subtotal + taxTotal - withholdingTotal).toFixed(2);

  return { subtotal: +subtotal.toFixed(2), taxes: groupedTaxes, withholdings, taxTotal, withholdingTotal, total };
}

function groupByCode(lines: TaxLine[]): TaxLine[] {
  const m = new Map<string, TaxLine>();
  for (const t of lines) {
    const e = m.get(t.code);
    if (!e) m.set(t.code, { ...t });
    else {
      e.base = +(e.base + t.base).toFixed(2);
      e.amount = +(e.amount + t.amount).toFixed(2);
    }
  }
  return Array.from(m.values());
}

// Demo: en engine no accedemos a DB; este valor se reemplaza en API
function getCustomerTaxIdMask(id: string) { return id.startsWith("PRO") ? "PROxxxx" : "CUSTxxxx"; }


