
import { addDays } from "date-fns";
import { cfg } from "./config.js";

export function nextDeadline(status: string, from: number): number {
  const m: Record<string, number> = {
    inquiry: cfg.sla.inquiry,
    chargeback: cfg.sla.chargeback,
    representment: cfg.sla.representment,
    prearbitration: cfg.sla.prearb,
    arbitration: cfg.sla.arbitration
  };
  const days = m[status] ?? 7;
  return addDays(new Date(from), days).getTime();
}


