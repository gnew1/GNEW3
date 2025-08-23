
import { Router } from "express";
import { syncFromGlue, importFromJson } from "../sync.js";
import { z } from "zod";

export const syncRoutes = Router();

syncRoutes.post("/sync/glue", async (_req, res) => {
  try {
    const out = await syncFromGlue();
    res.json({ ok: true, ...out });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
});

syncRoutes.post("/sync/import", (req, res) => {
  const Body = z.any(); // validación la hace el importador de forma laxa
  try {
    Body.parse(req.body ?? {});
    const out = importFromJson(req.body);
    res.json({ ok: true, ...out });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});


