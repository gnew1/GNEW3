
/**
 * Scoring heurístico 0..100:
 *  - +factor por importe (log)
 *  - +por razón 'fraud'/'not_received'
 *  - +historial de disputas del partner (ratio últimos 90d)
 */
import { db } from "./db.js";

export function riskScore(params: {
  partnerId: string;
  amountMinor: number;
  reason: string;
}): number {
  const base = 10 + Math.min(50, Math.log10(Math.max(1, params.amountMinor)) * 10);
  const reasonBoost = params.reason === "fraud" ? 30
    : params.reason === "not_received" ? 15
    : params.reason === "not_as_described" ? 10 : 5;

  const past = db.prepare(`
    SELECT
      SUM(CASE WHEN state IN ('lost','partial') THEN 1 ELSE 0 END) AS losts,
      COUNT(*) AS total
    FROM disputes
    WHERE partnerId=? AND createdAt >= ?
  `).get(params.partnerId, Date.now() - 90 * 24 * 3600 * 1000) as any;
  const ratio = past?.total ? (past.losts || 0) / past.total : 0;
  const histBoost = Math.min(20, ratio * 100 * 0.3);

  return Math.round(Math.max(0, Math.min(100, base + reasonBoost + histBoost)));
}


