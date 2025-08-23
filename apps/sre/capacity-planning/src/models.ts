export type UsageRow = {
  date: string;      // YYYY-MM-DD
  service: string;   // e.g., "compute"
  usage: number;     // e.g., vCPUh per month
};

export type ServicePricing = {
  unit: string;            // "vCPUh", "GB-month", etc.
  onDemandRate: number;    // cost per unit
  reservedRate: number;    // cost per unit committed
  granularity: number;     // step for search (units per month)
  maxCommitMultiplier?: number; // optional safety cap vs max forecast
};

export type Config = {
  period: "month";
  horizon: number;              // months to forecast (3 for a quarter)
  alpha: number;                // Holt smoothing for level
  beta: number;                 // Holt smoothing for trend
  services: Record<string, ServicePricing>;
};

export type ForecastPoint = {
  period: string; // YYYY-MM
  usage: number;
};

export type ServicePlan = {
  service: string;
  unit: string;
  forecast: ForecastPoint[];
  commit: number;             // units/month (constant over horizon)
  costOnDemandOnly: number;   // baseline
  costWithReservation: number;
  estimatedSavings: number;
};

export type PlanOutput = {
  quarter: string; // e.g., "Q3-2025"
  services: ServicePlan[];
  totalBaseline: number;
  totalWithReservation: number;
  totalSavings: number;
};

