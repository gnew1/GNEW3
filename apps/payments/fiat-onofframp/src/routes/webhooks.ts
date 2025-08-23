
import { Router } from "express";
import { getProvider } from "../providers/registry.js";
import { db } from "../db.js";
import { writeAudit } from "../audit.js";

export const webhooks = Router({});

webhooks.post("/:provider", async (req, res) => {
  const providerName = String(req.params.provider);
  const prov = getProvider(providerName);
  if (!prov) return res.status(404).json({ error: "provider_unknown" });

  const raw = (req as any).rawBody as string; // asignado por bodyParser en index.ts
  const verified = await prov.verifyWebhook(req.headers as any, raw);
  if (!verified) return res.status(400).json({ error: "bad_signature" });

  const evt = prov.parseWebhook(req.body);
  if (!evt) return res.status(400).json({ error: "malformed_event" });

  const ord = db.prepare("SELECT * FROM orders WHERE providerRef=?").get(evt.providerRef) as any;
  if (!ord) return res.status(404).json({ error: "order_not_found" });

  db.prepare("UPDATE orders SET status=?, updatedAt=? WHERE providerRef=?").run(evt.status, Date.now(), evt.providerRef);
  writeAudit(ord.id, "ORDER_STATUS", { from: ord.status, to: evt.status, providerRef: evt.providerRef });

  res.json({ ok: true });
});


