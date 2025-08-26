
import { AuditReport, Finding } from "../types";

const fakeLedger = [
  { id: "tx1", amountEUR: 100, onchain: 100 },
  { id: "tx2", amountEUR: 250, onchain: 249.5 },
  { id: "tx3", amountEUR: 500, onchain: 500 }
];

export async function runAuditChecks(): Promise<AuditReport> {
  const findings: Finding[] = [];

  for (const tx of fakeLedger) {
    const diff = Math.abs(tx.amountEUR - tx.onchain);
    if (diff >= 0.5) {
      findings.push({
        txid: tx.id,
        severity: "CRITICAL",
        description: `Mismatch € vs on-chain: diff=${diff}`
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    findings,
    status: findings.some(f => f.severity === "CRITICAL") ? "FAILED" : "PASSED"
  };
}


