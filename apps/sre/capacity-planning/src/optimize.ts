import { ForecastPoint, ServicePricing } from "./models.js";

/**
 * Given monthly forecast and pricing, find constant monthly commit that minimizes expected cost.
 * Cost(commit) = reservedRate * commit + onDemandRate * max(0, demand - commit)
 * Search is discrete with step = granularity.
 */
export function optimizeReservation(
  forecast: ForecastPoint[],
  pricing: ServicePricing
): { commit: number; cost: number; baseline: number; savings: number } {
  const maxForecast = Math.max(...forecast.map(f => f.usage));
  const cap = pricing.maxCommitMultiplier
    ? Math.ceil(maxForecast * pricing.maxCommitMultiplier)
    : Math.ceil(maxForecast);

  const step = Math.max(1, Math.floor(pricing.granularity));
  let bestCommit = 0;
  let bestCost = Number.POSITIVE_INFINITY;

  // Baseline: all On-Demand
  const baseline = forecast.reduce((acc, f) => acc + f.usage * pricing.onDemandRate, 0);

  for (let c = 0; c <= cap; c += step) {
    let total = 0;
    for (const f of forecast) {
      const ond = Math.max(0, f.usage - c);
      total += pricing.reservedRate * c + pricing.onDemandRate * ond;
    }
    if (total < bestCost) {
      bestCost = total;
      bestCommit = c;
    }
  }

  return {
    commit: bestCommit,
    cost: bestCost,
    baseline,
    savings: Math.max(0, baseline - bestCost)
  };
}

