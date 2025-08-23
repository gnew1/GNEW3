
import { Router } from "express";
import { runVerification } from "../verify.js";

export const verifyRoute = Router();

verifyRoute.post("/", async (req, res) => {
  try {
    const out = await runVerification(req.body);
    res.json(out);
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});


