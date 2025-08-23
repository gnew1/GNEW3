
import { create } from "xmlbuilder2";
import { db } from "./db.js";

/** SAF-T muy simplificado: MasterFiles (Customers) + GeneralLedgerEntries (Invoices). */
export function buildSAFT(country: string, year: number) {
  const customers = db.prepare("SELECT * FROM customers").all() as any[];
  const invoices = db.prepare("SELECT * FROM invoices WHERE strftime('%Y', issueDate/1000, 'unixepoch')=?").all(String(year)) as any[];

  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("AuditFile", { xmlns: "urn:OECD:StandardAuditFile-Tax:PT_1.04_01" })
      .ele("Header")
        .ele("AuditFileVersion").txt("1.04_01").up()
        .ele("CompanyID").txt("GNEW-DEMO").up()
        .ele("TaxRegistrationNumber").txt("EU00000000").up()
        .ele("TaxAccountingBasis").txt("F").up()
        .ele("CompanyName").txt("GNEW, S.A.").up()
        .ele("BusinessName").txt("GNEW").up()
        .ele("FiscalYear").txt(String(year)).up()
        .ele("StartDate").txt(`${year}-01-01`).up()
        .ele("EndDate").txt(`${year}-12-31`).up()
        .ele("CurrencyCode").txt(invoices[0]?.currency ?? "EUR").up()
      .up()

      .ele("MasterFiles");
  const mf = doc;

  for (const c of customers) {
    mf.ele("Customer")
      .ele("CustomerID").txt(c.id).up()
      .ele("CustomerTaxID").txt(c.taxId).up()
      .ele("CompanyName").txt(c.name).up()
      .ele("BillingAddress").ele("AddressDetail").txt(c.address).up().up()
    .up();
  }

  const gle = create().ele("GeneralLedgerEntries")
    .ele("NumberOfEntries").txt(String(invoices.length)).up()
    .ele("TotalDebit").txt("0.00").up()
    .ele("TotalCredit").txt("0.00").up();

  for (const inv of invoices) {
    gle.ele("Journal")
      .ele("Transaction")
        .ele("TransactionID").txt(inv.number).up()
        .ele("Period").txt(new Date(inv.issueDate).getMonth() + 1).up()
        .ele("TransactionDate").txt(new Date(inv.issueDate).toISOString().slice(0,10)).up()
        .ele("SourceDocumentID").txt(inv.id).up()
        .ele("Description").txt("Invoice").up()
        .ele("DocArchivalNumber").txt(inv.number).up()
        .ele("TransactionType").txt("N").up()
        .ele("CustomerID").txt(inv.customerId).up()
        .ele("TaxPayable").txt(inv.taxTotal.toFixed(2)).up()
        .ele("NetTotal").txt(inv.subtotal.toFixed(2)).up()
        .ele("GrossTotal").txt(inv.total.toFixed(2)).up()
      .up().up();
  }

  // Ensamblar: AuditFile/Header + MasterFiles + GeneralLedgerEntries
  const root = create({ version: "1.0", encoding: "UTF-8" })
    .ele("AuditFile", { xmlns: "urn:OECD:StandardAuditFile-Tax:PT_1.04_01" })
    .import(doc.root()!)
    .import(gle.root()!);

  return root.end({ prettyPrint: true });
}


