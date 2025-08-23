
import { create } from "xmlbuilder2";
import { db } from "./db.js";

/** XBRL mínimo para resumen fiscal (ingresos e IVA). */
export function buildXBRL(country: string, period: string) {
  // period: YYYY-Qn
  const [yearStr, qStr] = period.split("-");
  const year = Number(yearStr);
  const q = Number(qStr.replace("Q",""));
  const months = [1,2,3].map(m => (q-1)*3 + m);
  const start = new Date(Date.UTC(year, months[0]-1, 1));
  const end   = new Date(Date.UTC(year, months[2], 0));

  const rows = db.prepare(`
    SELECT * FROM invoices WHERE country=? AND issueDate BETWEEN ? AND ?
  `).all(country, start.getTime(), end.getTime()) as any[];

  const income = rows.reduce((a,r)=>a+r.subtotal,0);
  const vat = rows.reduce((a,r)=>a+r.taxTotal,0);

  const doc = create({ version:"1.0", encoding:"UTF-8" })
    .ele("xbrl", { xmlns: "http://www.xbrl.org/2003/instance" })
      .ele("context", { id: "C1" })
        .ele("entity").ele("identifier", { scheme: "urn:lei" }).txt("00000000000000000000").up().up()
        .ele("period")
          .ele("startDate").txt(start.toISOString().slice(0,10)).up()
          .ele("endDate").txt(end.toISOString().slice(0,10)).up()
        .up()
      .up()
      .ele("unit", { id: "U-EUR" }).ele("measure").txt("iso4217:EUR").up().up()
      .ele("Revenue", { "contextRef": "C1", "unitRef": "U-EUR" }).txt(income.toFixed(2)).up()
      .ele("VATPayable", { "contextRef": "C1", "unitRef": "U-EUR" }).txt(vat.toFixed(2)).up();

  return doc.end({ prettyPrint: true });
}


