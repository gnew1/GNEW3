
import { Router } from "express";

export const valuationRouter = Router();

// Fórmula simple de valoración (mock)
function calculateValuation(price: number, supply: number, demandFactor: number): number {
  return price * supply * demandFactor;
}

valuationRouter.post("/", async (req, res) => {
  const { price, supply, demandFactor } = req.body;

  if (typeof price !== "number" || typeof supply !== "number" || typeof demandFactor !== "number") {
    return res.status(400).json({ error: "Invalid input. Expected numbers." });
  }

  const valuation = calculateValuation(price, supply, demandFactor);
  res.json({ valuation });
});


