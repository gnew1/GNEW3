
import { create } from "xmlbuilder2";
import { InvoiceInput } from "./models.js";
import { computeInvoice } from "./engine.js";

export function buildUBL(inv: {
  id: string; input: InvoiceInput; number: string; supplier: { name: string; taxId: string };
  customer: { name: string; taxId: string; address: string; city?: string; zip?: string };
}): string {
  const comp = computeInvoice(inv.input);
  const doc = create({
    version: "1.0",
    encoding: "UTF-8",
    standalone: true
  }).ele("Invoice", {
    xmlns: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    "xmlns:cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "xmlns:cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  })
    .ele("cbc:CustomizationID").txt("urn:cen.eu:en16931:2017").up()
    .ele("cbc:ProfileID").txt("urn:fdc:peppol.eu:2017:poacc:billing:3.0").up()
    .ele("cbc:ID").txt(inv.number).up()
    .ele("cbc:IssueDate").txt(new Date(inv.input.issueDate ?? Date.now()).toISOString().slice(0,10)).up()
    .ele("cbc:InvoiceTypeCode").txt("380").up()
    .ele("cbc:DocumentCurrencyCode").txt(inv.input.currency).up()

    .ele("cac:AccountingSupplierParty")
      .ele("cac:Party")
        .ele("cac:PartyName").ele("cbc:Name").txt(inv.supplier.name).up().up()
        .ele("cac:PartyTaxScheme")
          .ele("cbc:CompanyID").txt(inv.supplier.taxId).up()
          .ele("cac:TaxScheme").ele("cbc:ID").txt("VAT").up().up()
        .up()
      .up()
    .up()

    .ele("cac:AccountingCustomerParty")
      .ele("cac:Party")
        .ele("cac:PartyName").ele("cbc:Name").txt(inv.customer.name).up().up()
        .ele("cac:PostalAddress")
          .ele("cbc:StreetName").txt(inv.customer.address).up()
          .ele("cbc:CityName").txt(inv.customer.city ?? "").up()
          .ele("cbc:PostalZone").txt(inv.customer.zip ?? "").up()
        .up()
        .ele("cac:PartyTaxScheme")
          .ele("cbc:CompanyID").txt(inv.customer.taxId).up()
          .ele("cac:TaxScheme").ele("cbc:ID").txt("VAT").up().up()
        .up()
      .up()
    .up();

  // Taxes
  for (const t of comp.taxes) {
    doc.ele("cac:TaxTotal")
      .ele("cbc:TaxAmount", { currencyID: inv.input.currency }).txt(t.amount.toFixed(2)).up()
      .ele("cac:TaxSubtotal")
        .ele("cbc:TaxableAmount", { currencyID: inv.input.currency }).txt(t.base.toFixed(2)).up()
        .ele("cbc:TaxAmount", { currencyID: inv.input.currency }).txt(t.amount.toFixed(2)).up()
        .ele("cac:TaxCategory")
          .ele("cbc:ID").txt(t.code).up()
          .ele("cbc:Percent").txt(String(t.rate * 100)).up()
          .ele("cac:TaxScheme").ele("cbc:ID").txt("VAT").up().up()
        .up()
      .up()
    .up();
  }

  doc.ele("cac:LegalMonetaryTotal")
    .ele("cbc:LineExtensionAmount", { currencyID: inv.input.currency }).txt(comp.subtotal.toFixed(2)).up()
    .ele("cbc:TaxExclusiveAmount", { currencyID: inv.input.currency }).txt((comp.subtotal).toFixed(2)).up()
    .ele("cbc:TaxInclusiveAmount", { currencyID: inv.input.currency }).txt((comp.subtotal + comp.taxTotal).toFixed(2)).up()
    .ele("cbc:PayableAmount", { currencyID: inv.input.currency }).txt(comp.total.toFixed(2)).up()
  .up();

  // Lines
  inv.input.lines.forEach((l, i) => {
    const base = +(l.qty * l.unitPrice).toFixed(2);
    doc.ele("cac:InvoiceLine")
      .ele("cbc:ID").txt(String(i+1)).up()
      .ele("cbc:InvoicedQuantity").txt(String(l.qty)).up()
      .ele("cbc:LineExtensionAmount", { currencyID: inv.input.currency }).txt(base.toFixed(2)).up()
      .ele("cac:Item").ele("cbc:Description").txt(l.description).up().up()
      .ele("cac:Price").ele("cbc:PriceAmount", { currencyID: inv.input.currency }).txt(l.unitPrice.toFixed(2)).up().up()
    .up();
  });

  return doc.end({ prettyPrint: true });
}


