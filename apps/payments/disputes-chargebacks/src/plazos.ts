
/** Plazos por esquema. Los valores son conservadores para demo. */
export function computeDeadlines(scheme: "card"|"bank"|"wallet", now = Date.now()) {
  const day = 24 * 60 * 60 * 1000;
  const evidenceWin = scheme === "card" ? 7 * day : scheme === "bank" ? 10 * day : 5 * day;
  const arbWin = scheme === "card" ? 45 * day : scheme === "bank" ? 30 * day : 20 * day;
  return { evidenceDueAt: now + evidenceWin, arbitrationDueAt: now + arbWin };
}


