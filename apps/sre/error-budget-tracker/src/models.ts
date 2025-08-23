
export type SLIType = "availability" | "latency";

export type EventRow = {
  ts: Date;             // timestamp
  success: boolean;     // operation result (for availability) or base success before latency check
  duration_ms?: number; // for latency SLI
};

export type WindowSpec = { name: string; ms: number };

export type AnalysisInput = {
  events: EventRow[];
  sli: SLIType;
  thresholdMs?: number;
  slo: number;               // e.g., 99.9
  budgetWindowDays: number;  // e.g., 28
  windows: WindowSpec[];
};

export type WindowStats = {
  window: WindowSpec;
  good: number;
  bad: number;
  total: number;
  errorRate: number;  // bad / total
  burnRate: number;   // errorRate / (1 - slo)
};

export type AnalysisOutput = {
  nowISO: string;
  slo: number;
  errorBudget: number;
  windows: WindowStats[];
  recommendations: {
    page: boolean;
    ticket: boolean;
    detail: string[];
  };
};


