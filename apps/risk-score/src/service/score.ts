
import { randomInt } from "crypto";

type KYC = { country: string; pep: boolean; sanctionsHit: boolean };
type Behavior = { txVolume: number; disputes: number; chargebacks: number };
type Liquidity = { assets: number; liabilities: number };

export function scoreCounterparty(input: { kyc: KYC; behavior: Behavior; liquidity: Liquidity }) {
  const { kyc, behavior, liquidity } = input;

  let score = 100;

  // Penalizaciones KYC
  if (kyc.pep) score -= 30;
  if (kyc.sanctionsHit) score -= 50;

  // Conducta
  score -= Math.min(behavior.disputes * 2, 20);
  score -= Math.min(behavior.chargebacks * 5, 30);
  if (behavior.txVolume > 1e6) score += 5;

  // Liquidez
  const ratio = liquidity.assets / (liquidity.liabilities + 1);
  if (ratio < 1) score -= 20;
  else if (ratio > 5) score += 10;

  // Boundaries
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    bucket: score >= 80 ? "LOW" : score >= 50 ? "MEDIUM" : "HIGH",
    explain: [
      `PEP=${kyc.pep}`,
      `Sanctions=${kyc.sanctionsHit}`,
      `Disputes=${behavior.disputes}`,
      `Chargebacks=${behavior.chargebacks}`,
      `LiquidityRatio=${ratio.toFixed(2)}`,
    ],
    calibrationId: randomInt(1e9),
  };
}


