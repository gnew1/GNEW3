
import { Router } from "express";
import { modelInfo } from "../model.js";

export const models = Router();

models.get("/", (_req, res) => {
  res.json({ active: modelInfo.id, bias: modelInfo.bias, weights: modelInfo.weights, metrics: { auc_roc: 0.86, ks: 0.32 } });
});


