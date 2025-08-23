
export type Finding = {
  txid: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  description: string;
};

export type AuditReport = {
  timestamp: string;
  findings: Finding[];
  status: "PASSED" | "FAILED";
};


