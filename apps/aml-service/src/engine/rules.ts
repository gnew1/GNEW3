
type TxCtx = {
  amount: number;
  channel: "card"|"bank"|"crypto"|"cash"|"p2p";
  countryFrom?: string;
  countryTo?: string;
  velocity: number;
  sanctionHit: boolean;
};

const HIGH_RISK_COUNTRIES = new Set(["IR","KP","SY","RU"]); // ejemplo, ajustar con listas reales
const AMOUNT_L2 = Number(process.env.RULE_AMOUNT_L2 ?? 10000);
const AMOUNT_L1 = Number(process.env.RULE_AMOUNT_L1 ?? 3000);

export function checkRules(tx: TxCtx) {
  const hits: string[] = [];
  let flag = false;
  let escalateL2 = false;

  if (tx.sanctionHit) { hits.push("sanctions_match"); escalateL2 = true; }
  if (tx.amount >= AMOUNT_L2 && (tx.countryFrom !== tx.countryTo)) { hits.push("high_amount_crossborder"); escalateL2 = true; }
  if (tx.amount >= AMOUNT_L1) { hits.push("high_amount"); flag = true; }
  if (tx.velocity >= 5 && tx.amount < 1000) { hits.push("structuring_velocity"); flag = true; }
  if (tx.channel === "crypto" && (tx.countryTo && HIGH_RISK_COUNTRIES.has(tx.countryTo))) { hits.push("crypto_to_high_risk"); flag = true; }

  return { hits, flag, escalateL2 };
}


