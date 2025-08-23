
import { db } from "./db.js";
import { nanoid } from "nanoid";

export function ensureSeries(country: string, year: number, code: string, prefix?: string) {
  const row = db.prepare("SELECT * FROM series WHERE country=? AND year=? AND code=?").get(country, year, code);
  if (row) return row;
  const id = nanoid();
  const pfx = prefix ?? `${country}-${year}-${code}-`;
  db.prepare("INSERT INTO series(id,country,year,code,prefix,nextNumber) VALUES(?,?,?,?,?,?)")
    .run(id, country, year, code, pfx, 1);
  return db.prepare("SELECT * FROM series WHERE id=?").get(id);
}

export function nextNumber(seriesId: string): { number: string; n: number } {
  const row = db.prepare("SELECT * FROM series WHERE id=?").get(seriesId) as any;
  const n = row.nextNumber as number;
  const formatted = String(n).padStart(6, "0");
  const number = `${row.prefix}${formatted}`;
  db.prepare("UPDATE series SET nextNumber=? WHERE id=?").run(n + 1, seriesId);
  return { number, n };
}


