
import { db } from "./db.js";

export type Signals = {
  amountMinorRecent?: number;     // suma últimas 24h
  txVelocity1h?: number;          // tx/hora recientes para esta wallet
  counterparties?: Array<{ address: string; risk: number }>;
  firstSeenAt?: number;           // epoch ms
};

export function scoreFor(address: string, signals: Signals): { score: number; decision: "allow"|"warn"|"block"; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const lists = db.prepare("SELECT list FROM lists WHERE address=?").all(address) as any[];
  const onDeny      = lists.some(l => l.list === "deny");
  const onSanctions = lists.some(l => l.list === "sanctions");
  const onAllow     = lists.some(l => l.list === "allow");
  const revoked     = !!db.prepare("SELECT 1 FROM revocations WHERE address=? AND (expiresAt IS NULL OR expiresAt>=?)")
                         .get(address, Date.now());

  if (onAllow && !onDeny && !onSanctions && !revoked) {
    reasons.push("allowlist");
  }
  if (onDeny)      { score += 0.5; reasons.push("denylist"); }
  if (onSanctions) { score += 0.5; reasons.push("sanctions"); }
  if (revoked)     { score += 0.5; reasons.push("revoked"); }

  const txVel = Math.max(0, signals.txVelocity1h ?? getVelocity(address));
  if (txVel > 0) {
    const add = Math.min(0.30, Math.log(1 + txVel) / 5);
    score += add; reasons.push(`tx_velocity_1h=${txVel}(+${add.toFixed(2)})`);
  }

  const amount = Math.max(0, signals.amountMinorRecent ?? 0);
  if (amount > 0) {
    const add = Math.min(0.20, Math.log(1 + amount / 1_000_000) / 10); // escala
    score += add; reasons.push(`amount_recent=${amount}(+${add.toFixed(2)})`);
  }

  const ageMs = Date.now() - (signals.firstSeenAt ?? getFirstSeen(address) ?? Date.now());
  const days = ageMs / (24*3600*1000);
  if (days < 7)  { score += 0.10; reasons.push("young_wallet_<7d"); }
  else if (days < 30) { score += 0.05; reasons.push("young_wallet_<30d"); }

  const cps = signals.counterparties ?? getCounterparties(address);
  const riskyCp = cps.some(c => c.risk >= 70);
  if (riskyCp) { score += 0.10; reasons.push("risky_counterparty"); }

  // thresholds
  const pol = db.prepare("SELECT * FROM policy WHERE id=1").get() as any;
  let decision: "allow"|"warn"|"block" = "allow";
  if (score >= pol.blockThreshold) decision = "block";
  else if (score >= pol.warnThreshold) decision = "warn";

  // allowlist relaja (si no hay sanción/deny/revoke)
  if (onAllow && decision !== "block") decision = "allow";

  return { score: Math.min(1, +score.toFixed(4)), decision, reasons };
}

function getVelocity(address: string): number {
  const key = `vel:${address}:${Math.floor(Date.now() / (60*60*1000))}`;
  const r = db.prepare("SELECT value FROM counters WHERE key=?").get(key) as any;
  return r?.value ?? 0;
}
function getFirstSeen(address: string): number | null {
  const r = db.prepare("SELECT firstSeenAt FROM wallets WHERE address=?").get(address) as any;
  return r?.firstSeenAt ?? null;
}
function getCounterparties(address: string) {
  return db.prepare("SELECT counterparty as address, risk FROM counterparts WHERE address=?").all(address) as any[];
}


