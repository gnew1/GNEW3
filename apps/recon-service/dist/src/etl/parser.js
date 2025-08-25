import { parse as parseCsv } from "csv-parse/sync";
export function parseCsvOrJson(input) {
    if (input.format === "csv") {
        if (typeof input.data !== "string" || !input.csv)
            throw new Error("csv_config_required");
        const recs = parseCsv(input.data, { columns: true, skip_empty_lines: true, delimiter: input.csv.delimiter ?? "," });
        return recs.map((r) => toRow(r, input.csv.headers, input.defaultCurrency, input.tz));
    }
    else {
        if (!Array.isArray(input.data))
            throw new Error("json_array_expected");
        if (!input.csv?.headers) {
            // Assume normalized keys
            return input.data.map((r) => ({
                ext_id: String(r.ext_id ?? r.id),
                amount: Number(r.amount),
                currency: String(r.currency ?? input.defaultCurrency ?? "EUR"),
                timestamp: new Date(r.timestamp ?? r.ts).toISOString(),
                memo: r.memo,
                external_ref: r.external_ref
            }));
        }
        else {
            // Map with provided headers
            return input.data.map((r) => toRow(r, input.csv.headers, input.defaultCurrency, input.tz));
        }
    }
}
function toRow(r, h, defCur, _tz) {
    const cur = h.currency ? r[h.currency] ?? defCur : defCur;
    const amountRaw = r[h.amount];
    const a = typeof amountRaw === "string" ? Number(amountRaw.replace(/[, ]/g, "")) : Number(amountRaw);
    if (!isFinite(a))
        throw new Error("bad_amount");
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
