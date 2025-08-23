
export type WalletId = string;
export type GuardianId = string;

export type Guardian = {
  id: GuardianId;
  walletId: WalletId;
  label: string;
  pubkeyEd25519: string; // base64 (guardian signs approvals)
  contact: { email?: string; phone?: string; webhook?: string };
  expiresAt: number; // epoch ms
  createdAt: number;
  active: boolean;
};

export type RecoverySession = {
  id: string;
  walletId: WalletId;
  threshold: number; // t
  total: number;     // n
  disputeWindowMs: number;
  startedAt: number;
  completeAfter: number; // startedAt + disputeWindowMs
  canceledAt?: number;
  completedAt?: number;
  evidence: string; // JSON string with device attest, reason, etc.
};

export type Approval = {
  id: string;
  sessionId: string;
  guardianId: GuardianId;
  signatureB64: string; // Ed25519 over session payload
  shareCipherB64: string; // Encrypted SSS share (guardian holds plain)
  createdAt: number;
};

export type AuditEntry = {
  id: string;
  walletId: WalletId;
  kind:
    | "GUARDIAN_NOMINATED"
    | "GUARDIAN_CONFIRMED"
    | "GUARDIAN_ROTATED"
    | "RECOVERY_STARTED"
    | "RECOVERY_APPROVAL"
    | "RECOVERY_DISPUTED"
    | "RECOVERY_COMPLETED";
  payload: string; // JSON
  ts: number;
  prevHashHex: string;
  hashHex: string;
};


