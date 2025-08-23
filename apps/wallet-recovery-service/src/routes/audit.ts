
import { Router } from "express";
import { listAudit } from "../audit.js";

export const audit = Router();

audit.get("/:walletId", (req, res) => {
  const { walletId } = req.params;
  res.json(listAudit(walletId));
});


