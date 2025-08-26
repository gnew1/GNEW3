
import { Router, NextFunction } from "express";
import pino from "pino";
import { syncFromGlue, importFromJson } from "../sync.js";
import { z } from "zod";

const logger = pino();

export const syncRoutes = Router();

syncRoutes.post("/sync/glue", async (_req, res, next: NextFunction) => {
  try {
    const out = await syncFromGlue();
    res.json({ ok: true, ...out });
  } catch (e: any) {
    logger.error(e);
    next(e);
  }
});

syncRoutes.post("/sync/import", (req, res, next: NextFunction) => {
  const Body = z.any(); // validación la hace el importador de forma laxa
  try {
    Body.parse(req.body ?? {});
    const out = importFromJson(req.body);
    res.json({ ok: true, ...out });
  } catch (e: any) {
    logger.error(e);
    next(e);
  }
});


