
import { LineInput, TaxLine } from "../models.js";

export type RuleContext = {
  currency: string;
  supplierCountry: string;
  customerCountry: string;
  customerTaxId: string;
};

export type JurisdictionRules = {
  // Devuelve taxline por línea (IVA/Impuesto ventas)
  taxForLine: (line: LineInput, ctx: RuleContext) => TaxLine;
  // Retenciones a nivel documento (p.ej., IRPF ES si aplica)
  withholdingsForInvoice?: (ctx: RuleContext) => TaxLine[];
  // Validaciones específicas (numeración, campos obligatorios, etc.)
  validate?: (ctx: RuleContext, inv: { lines: LineInput[] }) => string[];
  // Formatea taxCode → {code, rate}
  parseTaxCode?: (code?: string) => { code: string, rate: number } | null;
};


