import { create } from "xmlbuilder2";
export function createXbrlInstance(input) {
    const doc = create({ version: "1.0", encoding: "UTF-8" })
        .ele("xbrli:xbrl", {
        "xmlns:xbrli": "http://www.xbrl.org/2003/instance",
        "xmlns:link": "http://www.xbrl.org/2003/linkbase",
        "xmlns:xlink": "http://www.w3.org/1999/xlink",
        "xmlns:gnew": "https://gnew.example/xbrl",
        "xmlns:iso4217": "http://www.xbrl.org/2003/iso4217",
    });
    // Context
    doc.ele("xbrli:context", { id: "C1" })
        .ele("xbrli:entity").ele("xbrli:identifier", { scheme: "https://gnew.example/id" }).txt(input.entityId).up().up()
        .ele("xbrli:period")
        .ele("xbrli:startDate").txt(input.periodStart).up()
        .ele("xbrli:endDate").txt(input.periodEnd).up()
        .up().up();
    // Unit per currency on demand
    const seen = new Set();
    for (const f of input.facts) {
        if (seen.has(f.currency))
            continue;
        seen.add(f.currency);
        doc.ele("xbrli:unit", { id: `U-${f.currency}` })
            .ele("xbrli:measure").txt(`iso4217:${f.currency}`).up()
            .up();
    }
    // Facts
    for (const f of input.facts) {
        doc.ele(f.concept, { contextRef: "C1", unitRef: `U-${f.currency}` })
            .att("accountCode", f.accountCode)
            .att("accountName", f.accountName)
            .txt((Math.round(f.value * 100) / 100).toString())
            .up();
    }
    return doc.end({ prettyPrint: true });
}
