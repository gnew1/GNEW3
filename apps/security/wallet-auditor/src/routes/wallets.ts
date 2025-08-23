
import { Router } from "express";
import { db } from "../db.js";

export const wallets = Router();

wallets.get("/:address", (req, res) => {
  const address = req.params.address.toLowerCase();
  const w = db.prepare("SELECT * FROM wallets WHERE address=?").get(address) as any;
  if (!w) return res.status(404).json({ error: "not_found" });
  const ev = db.prepare("SELECT id,kind,payload,ts FROM wallet_events WHERE address=? ORDER BY ts DESC LIMIT 100").all(address) as any[];
  res.json({ wallet: w, events: ev });
});


