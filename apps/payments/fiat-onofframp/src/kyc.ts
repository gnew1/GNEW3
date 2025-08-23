
import { db } from "./db.js";
import { KYCRecord } from "./models.js";

export function upsertKyc(walletId: string, status: KYCRecord["status"], evidence: unknown): KYCRecord {
  const now = Date.now();
  const ev = JSON.stringify(evidence ?? {});
  db.prepare(`
    INSERT INTO kyc(walletId,status,evidence,updatedAt) VALUES(?,?,?,?)
    ON CONFLICT(walletId) DO UPDATE SET status=excluded.status, evidence=excluded.evidence, updatedAt=excluded.updatedAt
  `).run(walletId, status, ev, now);
  return { walletId, status, evidence: ev, updatedAt: now };
}

export function getKyc(walletId: string): KYCRecord | undefined {
  return db.prepare("SELECT * FROM kyc WHERE walletId=?").get(walletId) as KYCRecord | undefined;
}


