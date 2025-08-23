
import { Router } from "express";
import { listAudit } from "../audit.js";

export const audit = Router();

audit.get("/:scopeId", (req, res) => {
  res.json(listAudit(req.params.scopeId));
});


