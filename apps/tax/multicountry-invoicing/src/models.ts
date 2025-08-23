
export type CountryCode = "ES" | "PT" | "US";
export type Currency = "EUR" | "USD";

export type LineInput = {
  description: string;
  qty: number;
  unitPrice: number;
  taxCode?: string; // p.ej. "ES:IVA21"
};

export type InvoiceInput = {
  country: CountryCode;
  currency: Currency;
  series: { country: CountryCode; year: number; code: string };
  supplier: { name: string; taxId: string };
  customer: { id: string };
  issueDate?: number; // epoch ms
  lines: LineInput[];
  withholdings?: Array<{ code: string; rate: number }>; // p.ej. ES:IRPF15
  notes?: string;
};

export type TaxLine = {
  code: string; rate: number; base: number; amount: number;
};

export type InvoiceComputed = {
  subtotal: number;
  taxes: TaxLine[];
  withholdings: TaxLine[];
  taxTotal: number;
  withholdingTotal: number;
  total: number;
};


