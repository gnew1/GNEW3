
/** Utilidades de dinero en minor units (enteros). */
export function pctToPpm(pct: number): number {
  // 1% = 10000 ppm
  return Math.round(pct * 10000);
}
export function roundHalfUp(n: number): number {
  return Math.sign(n) * Math.round(Math.abs(n));
}
export function applyPctPpm(amountMinor: number, ppm: number): number {
  // amount * ppm / 1_000_000
  return Math.floor((amountMinor * ppm + 500_000) / 1_000_000); // half-up
}
export function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}


