
#!/usr/bin/env node
import express from "express";
import { cfg } from "./config.js";
import "./db.js";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "./db.js";
import { ensureSeries, nextNumber } from "./numbering.js";
import { computeInvoice } from "./engine.js";
import { buildUBL } from "./ubl.js";
import { buildSAFT } from "./saft.js";
import { buildXBRL } from "./xbrl.js";
import { appendArchive } from "./archive.js";

const app = express();
app.use(express.json({ limit: "512kb" }));

app.get("/healthz", (_req,res)=>res.json({ok:true}));

app.post("/series", (req, res) => {
  const P = z.object({ country: z.enum(["ES","PT","US"]), year: z.number().int(), code: z.string().min(1), prefix: z.string().optional() });
  const p = P.parse(req.body);
  const s = ensureSeries(p.country, p.year, p.code, p.prefix);
  res.json(s);
});

app.post("/customers", (req, res) => {
  const P = z.object({ id: z.string().min(4), country: z.string().min(2), taxId: z.string().min(3), name: z.string().min(1), address: z.string().min(3), city: z.string().optional(), zip: z.string().optional() });
  const p = P.parse(req.body);
  db.prepare("INSERT OR REPLACE INTO customers(id,country,taxId,name,address,city,zip) VALUES(?,?,?,?,?,?,?)")
    .run(p.id, p.country, p.taxId, p.name, p.address, p.city ?? null, p.zip ?? null);
  res.json({ ok: true, id: p.id });
});

app.post("/invoices", (req, res) => {
  const P = z.object({
    country: z.enum(["ES","PT","US"]),
    currency: z.enum(["EUR","USD"]),
    series: z.object({ country: z.enum(["ES","PT","US"]), year: z.number().int(), code: z.string() }),
    supplier: z.object({ name: z.string(), taxId: z.string() }),
    customer: z.object({ id: z.string() }),
    issueDate: z.number().int().optional(),
    lines: z.array(z.object({ description: z.string(), qty: z.number().positive(), unitPrice: z.number().positive(), taxCode: z.string().optional() })).min(1),
    withholdings: z.array(z.object({ code: z.string(), rate: z.number().min(0).max(1) })).optional(),
    notes: z.string().optional()
  });
  const p = P.parse(req.body);

  const cust = db.prepare("SELECT * FROM customers WHERE id=?").get(p.customer.id) as any;
  if (!cust) return res.status(404).json({ error: "customer_not_found" });

  const s = ensureSeries(p.series.country, p.series.year, p.series.code);
  const { number } = nextNumber(s.id);

  const totals = computeInvoice({
    ...p,
    issueDate: p.issueDate ?? Date.now()
  });

  const id = nanoid();
  db.prepare(`INSERT INTO invoices(id,country,currency,seriesId,number,issueDate,supplierName,supplierTaxId,customerId,subtotal,taxTotal,withholdingTotal,total,json)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, p.country, p.currency, s.id, number, p.issueDate ?? Date.now(), p.supplier.name, p.supplier.taxId, cust.id, totals.subtotal, totals.taxTotal, totals.withholdingTotal, totals.total, JSON.stringify(p));

  const insLine = db.prepare("INSERT INTO invoice_lines(id,invoiceId,description,qty,unitPrice,taxCode,taxRate,lineTotal) VALUES(?,?,?,?,?,?,?,?)");
  for (const l of p.lines) {
    const total = +(l.qty * l.unitPrice).toFixed(2);
    const rate = (l.taxCode?.match(/(\d+)/)?.[1] ?? "0");
    insLine.run(nanoid(), id, l.description, l.qty, l.unitPrice, l.taxCode ?? "-", Number(rate)/100, total);
  }

  appendArchive(id, "INVOICE_CREATED", { number, totals });
  res.json({ id, number, totals });
});

app.get("/invoices/:id", (req,res) => {
  const inv = db.prepare("SELECT * FROM invoices WHERE id=?").get(req.params.id) as any;
  if (!inv) return res.status(404).json({ error: "not_found" });
  const cust = db.prepare("SELECT * FROM customers WHERE id=?").get(inv.customerId) as any;
  res.json({ invoice: inv, customer: cust });
});

app.get("/export/ubl/:id", (req,res) => {
  const inv = db.prepare("SELECT * FROM invoices WHERE id=?").get(req.params.id) as any;
  if (!inv) return res.status(404).json({ error: "not_found" });
  const input = JSON.parse(inv.json);
  const cust = db.prepare("SELECT * FROM customers WHERE id=?").get(inv.customerId) as any;
  const xml = buildUBL({
    id: inv.id,
    input,
    number: inv.number,
    supplier: { name: inv.supplierName, taxId: inv.supplierTaxId },
    customer: { name: cust.name, taxId: cust.taxId, address: cust.address, city: cust.city, zip: cust.zip }
  });
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

app.get("/export/saft", (req,res) => {
  const country = String(req.query.country ?? "ES");
  const year = Number(req.query.year ?? new Date().getUTCFullYear());
  const xml = buildSAFT(country, year);
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

app.get("/export/xbrl", (req,res) => {
  const country = String(req.query.country ?? "ES");
  const period = String(req.query.period ?? `${new Date().getUTCFullYear()}-Q1`);
  const xml = buildXBRL(country, period);
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

app.get("/archive/:scopeId", (req,res)=>{
  const rows = db.prepare("SELECT * FROM archive WHERE scopeId=? ORDER BY ts ASC").all(req.params.scopeId);
  res.json(rows);
});

app.listen(cfg.port, ()=>console.log(`tax multi-country listening on :${cfg.port}`));


