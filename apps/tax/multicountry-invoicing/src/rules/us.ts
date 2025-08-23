
import { LineInput, TaxLine } from "../models.js";
import { JurisdictionRules, RuleContext } from "./types.js";

/**
 * EEUU (demo):
 * - Sales Tax configurable en taxCode "US:STx" donde x = 0..10 (porcentaje).
 */
export const USRules: JurisdictionRules = {
  parseTaxCode(code?: string) {
    if (!code) return { code: "US:ST0", rate: 0 };
    const m = code.match(/^US:ST(\d{1,2})$/);
    if (m) return { code, rate: Number(m[1]) / 100 };
    return { code: "US:ST0", rate: 0 };
  },
  taxForLine(line: LineInput, _ctx: RuleContext): TaxLine {
    const tc = USRules.parseTaxCode!(line.taxCode);
    const base = line.qty * line.unitPrice;
    return { code: tc!.code, rate: tc!.rate, base, amount: +(base * tc!.rate).toFixed(2) };
  }
};


