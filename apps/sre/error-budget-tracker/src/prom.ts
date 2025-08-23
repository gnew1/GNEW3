
import YAML from "yaml";
import { WindowSpec } from "./models.js";

/**
 * Genera AlertingRules de Prometheus para burn-rate multi-ventana.
 * Usa métricas estándar:
 *   sli_requests_total{job="",service=""}
 *   sli_requests_bad_total{job="",service=""}
 * Puedes ajustar labels con flags de CLI.
 */
export function buildPrometheusRules(opts: {
  job: string;
  service: string;
  slo: number;
  budgetWindowDays: number;
  windows: WindowSpec[];
}) {
  const budget = 1 - opts.slo / 100;
  const labels = `{job="${opts.job}",service="${opts.service}"}`;

  // Helper expr para ratio de errores por rango
  const rr = (range: string) =>
    `sum(increase(sli_requests_bad_total${labels}[${range}])) / sum(increase(sli_requests_total${labels}[${range}]))`;

  // burn = error_rate / budget
  const burn = (range: string) => `(${rr(range)}) / ${budget}`;

  const short = fmt(opts.windows[0]);
  const long = fmt(opts.windows[opts.windows.length - 1]);
  const medium = fmt(opts.windows[Math.floor(opts.windows.length / 2)]);

  const groups = [
    {
      name: `slo-${opts.service}-burn`,
      rules: [
        {
          alert: `SLOBurnBudgetP1_${opts.service}`,
          expr: `${burn(short)} >= 14.4 and ${burn(long)} >= 6`,
          for: "2m",
          labels: { severity: "page", service: opts.service, slo: `${opts.slo}` },
          annotations: {
            summary: `High burn for ${opts.service}`,
            description: `Burn ${short} & ${long} exceed P1 thresholds. SLO=${opts.slo}%.`
          }
        },
        {
          alert: `SLOBurnBudgetP2_${opts.service}`,
          expr: `${burn(medium)} >= 3 and ${burn(long)} >= 1`,
          for: "15m",
          labels: { severity: "ticket", service: opts.service, slo: `${opts.slo}` },
          annotations: {
            summary: `Elevated burn for ${opts.service}`,
            description: `Burn ${medium} & ${long} exceed P2 thresholds. SLO=${opts.slo}%.`
          }
        }
      ]
    }
  ];

  return YAML.stringify({ groups });
}

function fmt(w: WindowSpec): string {
  const ms = w.ms;
  const m = Math.round(ms / 60000);
  if (m % (24 * 60) === 0) return `${m / (24 * 60)}d`;
  if (m % 60 === 0) return `${m / 60}h`;
  return `${m}m`;
}


