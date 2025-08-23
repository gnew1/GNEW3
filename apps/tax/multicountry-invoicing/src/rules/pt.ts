
import { LineInput, TaxLine } from "../models.js";
import { JurisdictionRules, RuleContext } from "./types.js";

/**
 * Portugal (demo):
 * - IVA 23% por defecto; permite "PT:IVA6" y "PT:IVA13".
 * - Sin retención por defecto en demo.
 */
export const PTRules: JurisdictionRules = {
  parseTaxCode(code?: string) {
    if (!code) return { code: "PT:IVA23", rate: 0.23 };
    const m = code.match(/^PT:IVA(6|13|23)$/);
    if (m) return { code, rate: Number(m[1]) / 100 };
    return { code: "PT:IVA23", rate: 0.23 };
  },
  taxForLine(line: LineInput, _ctx: RuleContext): TaxLine {
    const tc = PTRules.parseTaxCode!(line.taxCode);
    const base = line.qty * line.unitPrice;
    return { code: tc!.code, rate: tc!.rate, base, amount: +(base * tc!.rate).toFixed(2) };
  }
};


