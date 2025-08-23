
import { Router } from "express";
import { db } from "../db.js";

export const balances = Router();

balances.get("/", (req, res) => {
  const partnerId = String(req.query.partnerId ?? "");
  if (!partnerId) return res.status(400).json({ error: "partnerId_required" });
  const rows = db.prepare("SELECT currency, availableMinor, updatedAt FROM balances WHERE partnerId=?").all(partnerId) as any[];
  res.json({ partnerId, balances: rows });
});


