
import { LineInput, TaxLine } from "../models.js";
import { JurisdictionRules, RuleContext } from "./types.js";

/**
 * España (demo):
 * - IVA por defecto 21%; admite 10% / 4% mediante taxCode "ES:IVA10" etc.
 * - Retención IRPF 7%/15% según actividad (simplificado: si customerTaxId empieza por "PRO", 15%).
 */
export const ESRules: JurisdictionRules = {
  parseTaxCode(code?: string) {
    if (!code) return { code: "ES:IVA21", rate: 0.21 };
    const m = code.match(/^ES:IVA(4|10|21)$/);
    if (m) return { code, rate: Number(m[1]) / 100 };
    return { code: "ES:IVA21", rate: 0.21 };
  },
  taxForLine(line: LineInput, _ctx: RuleContext): TaxLine {
    const tc = ESRules.parseTaxCode!(line.taxCode);
    const base = line.qty * line.unitPrice;
    return { code: tc!.code, rate: tc!.rate, base, amount: +(base * tc!.rate).toFixed(2) };
  },
  withholdingsForInvoice(ctx: RuleContext): TaxLine[] {
    // demo: retención IRPF 15% para profesionales (NIF prefijado "PRO")
    if (ctx.customerTaxId.startsWith("PRO")) {
      return [{ code: "ES:IRPF15", rate: 0.15, base: 0, amount: 0 }]; // base se calcula post-lineas (subtotal)
    }
    return [];
  },
  validate(_ctx, inv) {
    const errs: string[] = [];
    if (inv.lines.length === 0) errs.push("Debe incluir al menos una línea");
    return errs;
  }
};


