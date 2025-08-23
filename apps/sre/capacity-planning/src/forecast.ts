import { ForecastPoint } from "./models.js";
import { format } from "date-fns";

/**
 * Holt linear trend (double exponential smoothing) without seasonality.
 * Returns horizon-step forecast based on monthly historical series.
 */
export function forecastHoltLinear(
  history: number[],
  datesISO: Date[],
  alpha = 0.4,
  beta = 0.2,
  horizon = 3
): ForecastPoint[] {
  if (history.length < 2) {
    throw new Error("Need at least 2 historical points for Holt's method.");
  }
  // Initialize level and trend
  let L = history[0];
  let B = history[1] - history[0];

  for (let t = 1; t < history.length; t++) {
    const y = history[t];
    const L_prev = L;
    const B_prev = B;
    L = alpha * y + (1 - alpha) * (L_prev + B_prev);
    B = beta * (L - L_prev) + (1 - beta) * B_prev;
  }

  // Forecast next horizon months
  const lastDate = datesISO[datesISO.length - 1];
  const out: ForecastPoint[] = [];
  for (let m = 1; m <= horizon; m++) {
    const yhat = L + m * B;
    const d = new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth() + m, 1));
    out.push({ period: format(d, "yyyy-MM"), usage: Math.max(0, yhat) });
  }
  return out;
}

