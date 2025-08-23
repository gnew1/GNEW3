
import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import { EventRow } from "./models.js";

export async function readEventsCsv(path: string): Promise<EventRow[]> {
  return new Promise((resolve, reject) => {
    const rows: EventRow[] = [];
    createReadStream(path)
      .pipe(parse({ columns: true, trim: true }))
      .on("data", (rec: any) => {
        const ts = new Date(rec.ts);
        if (Number.isNaN(ts.getTime())) return; // skip bad row
        const success = String(rec.success).toLowerCase() === "true";
        const duration = rec.duration_ms !== undefined && rec.duration_ms !== "" ? Number(rec.duration_ms) : undefined;
        rows.push({ ts, success, duration_ms: duration });
      })
      .on("error", reject)
      .on("end", () => resolve(rows.sort((a, b) => a.ts.getTime() - b.ts.getTime())));
  });
}


