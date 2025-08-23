
import { parse as parseCsv } from "csv-parse/sync";

export type NormalizedRow = {
  ext_id: string;
  amount: number;
  currency: string;
  timestamp: string; // ISO
  memo?: string;
  external_ref?: string;
};

export function parseCsvOrJson(input: {
  format: "csv"|"json",
  data: string | Array<Record<string, any>>,
  csv?: {
    delimiter?: string,
    headers: { id: string; amount: string; timestamp: string; currency?: string; memo?: string; external_ref?: string }
  },
  defaultCurrency?: string,
  tz?: string
}): NormalizedRow[] {
  if (input.format === "csv") {
    if (typeof input.data !== "string" || !input.csv) throw new Error("csv_config_required");
    const recs = parseCsv(input.data, { columns: true, skip_empty_lines: true, delimiter: input.csv.delimiter ?? "," }) as Record<string, string>[];
    return recs.map((r) => toRow(r, input.csv!.headers, input.defaultCurrency, input.tz));
  } else {
    if (!Array.isArray(input.data)) throw new Error("json_array_expected");
    if (!input.csv?.headers) {
      // Assume normalized keys
      return (input.data as NormalizedRow[]).map((r) => ({
        ext_id: String((r as any).ext_id ?? (r as any).id),
        amount: Number((r as any).amount),
        currency: String((r as any).currency ?? input.defaultCurrency ?? "EUR"),
        timestamp: new Date((r as any).timestamp ?? (r as any).ts).toISOString(),
        memo: (r as any).memo,
        external_ref: (r as any).external_ref
      }));
    } else {
      // Map with provided headers
      return (input.data as any[]).map((r) => toRow(r as any, input.csv!.headers!, input.defaultCurrency, input.tz));
    }
  }
}

function toRow(r: Record<string, any>, h: { id: string; amount: string; timestamp: string; currency?: string; memo?: string; external_ref?: string }, defCur?: string, _tz?: string): NormalizedRow {
  const cur = h.currency ? r[h.currency] ?? defCur : defCur;
  const amountRaw = r[h.amount];
  const a = typeof amountRaw === "string" ? Number(amountRaw.replace(/[, ]/g, "")) : Number(amountRaw);
  if (!isFinite(a)) throw new Error("bad_amount");
  const iso = new Date(r[h.timestamp]).toISOString();
  return {
    ext_id: String(r[h.id]),
    amount: a,
    currency: String(cur ?? "EUR"),
    timestamp: iso,
    memo: h.memo ? String(r[h.memo] ?? "") : undefined,
    external_ref: h.external_ref ? String(r[h.external_ref] ?? "") : undefined
  };
}


