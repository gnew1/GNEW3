
/**
 * GNEW · N329 — Score de riesgo de contraparte
 * Rol: Data + Producto
 * Objetivo: Puntaje por KYC, conducta, liquidez.
 * Stack: Modelos supervisados; reglas.
 * Entregables: API risk/score, panel.
 * Pasos: Features y calibración.
 * Pruebas/DoD: KS/AUC objetivos; estrés.
 * Seguridad & Observabilidad: Sesgos; explicabilidad.
 * Despliegue: Sólo lectura en inicio.
 */

import express from "express";
import { z } from "zod";
import { scoreCounterparty } from "./service/score";

const app = express();
app.use(express.json());

const ScoreRequest = z.object({
  kyc: z.object({
    country: z.string(),
    pep: z.boolean(),
    sanctionsHit: z.boolean(),
  }),
  behavior: z.object({
    txVolume: z.number(),
    disputes: z.number(),
    chargebacks: z.number(),
  }),
  liquidity: z.object({
    assets: z.number(),
    liabilities: z.number(),
  }),
});

app.post("/api/risk/score", (req, res) => {
  const parsed = ScoreRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }
  const score = scoreCounterparty(parsed.data);
  res.json(score);
});

export default app;


