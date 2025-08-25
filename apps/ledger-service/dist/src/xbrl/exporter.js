import { create } from "xmlbuilder2";
export function exportXBRLInstance(input) {
    const { entityId, periodYM, currency, items } = input;
    const periodStart = `${periodYM}-01`;
    // naive end date: add 1 month minus a day (XBRL context can be instant or duration; use duration monthly)
    const [y, m] = periodYM.split("-").map((x) => parseInt(x, 10));
    const end = new Date(Date.UTC(y, m, 0)); // last day of month
    const periodEnd = end.toISOString().slice(0, 10);
    const doc = create({ version: "1.0", encoding: "UTF-8" })
        .ele("xbrli:xbrl", {
        "xmlns:xbrli": "http://www.xbrl.org/2003/instance",
        "xmlns:link": "http://www.xbrl.org/2003/linkbase",
        "xmlns:xlink": "http://www.w3.org/1999/xlink",
        "xmlns:gnew": "http://xbrl.gnew.io/taxonomy",
        "xmlns:iso4217": "http://www.xbrl.org/2003/iso4217",
    });
    // Context
    doc.ele("xbrli:context", { id: "c1" })
        .ele("xbrli:entity")
        .ele("xbrli:identifier", { scheme: "http://gnew.io/entity" })
        .txt(entityId)
        .up()
        .up()
        .ele("xbrli:period")
        .ele("xbrli:startDate")
        .txt(periodStart)
        .up()
        .ele("xbrli:endDate")
        .txt(periodEnd)
        .up()
        .up();
    // Unit (currency)
    doc.ele("xbrli:unit", { id: "u1" })
        .ele("xbrli:measure")
        .txt(`iso4217:${currency}`)
        .up()
        .up();
    // Facts (custom taxonomy elements: gnew:AccountBalance with attributes)
    for (const it of items) {
        doc
            .ele("gnew:AccountBalance", { contextRef: "c1", unitRef: "u1", decimals: "2", "code": it.code, "name": it.name, "type": it.type })
            .txt(it.balance)
            .up();
    }
    return doc.end({ prettyPrint: true });
}
