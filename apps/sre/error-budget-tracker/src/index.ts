
#!/usr/bin/env node
import { Command } from "commander";
import { readEventsCsv } from "./ingest.js";
import { analyze } from "./burn.js";
import { AnalysisInput, SLIType, WindowSpec } from "./models.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { buildPrometheusRules } from "./prom.js";

function parseWindows(list: string): WindowSpec[] {
  const items = list.split(",").map(s => s.trim()).filter(Boolean);
  const toMs = (token: string) => {
    const m = token.match(/^(\d+)([mhd])$/i);
    if (!m) throw new Error(`Ventana inválida: ${token}`);
    const n = Number(m[1]); const u = m[2].toLowerCase();
    if (u === "m") return n * 60_000;
    if (u === "h") return n * 3_600_000;
    return n * 86_400_000;
  };
  return items.map((tok) => ({ name: tok, ms: toMs(tok) })).sort((a, b) => a.ms - b.ms);
}

const program = new Command();
program
  .requiredOption("--events <path>", "CSV de eventos con columnas ts,success[,duration_ms]")
  .requiredOption("--sli <availability|latency>", "Tipo de SLI")
  .requiredOption("--slo <num>", "SLO objetivo (p. ej. 99.9)")
  .option("--threshold-ms <num>", "Umbral de latencia en ms (si sli=latency)", (v) => Number(v))
  .option("--window <list>", "Lista de ventanas (por defecto 5m,1h,6h,24h)", "5m,1h,6h,24h")
  .option("--budget-window-days <num>", "Días de ventana presupuestaria (default 28)", (v) => Number(v), 28)
  .option("--export-prometheus <path>", "Ruta de salida de reglas Prometheus")
  .option("--job <name>", "Label job para exportación", "api")
  .option("--service <name>", "Label service para exportación", "backend");

program.parse(process.argv);
const opts = program.opts<{
  events: string;
  sli: SLIType;
  thresholdMs?: number;
  slo: string;
  window: string;
  budgetWindowDays: number;
  exportPrometheus?: string;
  job: string;
  service: string;
}>();

(async () => {
  const events = await readEventsCsv(opts.events);
  const windows = parseWindows(opts.window);
  const input: AnalysisInput = {
    events,
    sli: opts.sli,
    thresholdMs: opts.thresholdMs,
    slo: Number(opts.slo),
    budgetWindowDays: opts.budgetWindowDays,
    windows
  };
  const res = analyze(input);

  // Print human report
  console.log(`SLO ${res.slo}% | Error budget ${(res.errorBudget * 100).toFixed(3)}% | now=${res.nowISO}`);
  for (const w of res.windows) {
    console.log(
      `${w.window.name.padEnd(5)}  total=${String(w.total).padStart(6)}  bad=${String(w.bad).padStart(6)}  ` +
      `err=${(w.errorRate * 100).toFixed(3)}%  burn=${w.burnRate.toFixed(2)}x`
    );
  }
  console.log(`Recommendation: ${res.recommendations.detail.join(" | ")}`);
  if (res.recommendations.page) console.log("ALERT: PAGE (P1)");
  else if (res.recommendations.ticket) console.log("ALERT: TICKET (P2)");

  if (opts.exportPrometheus) {
    const yaml = buildPrometheusRules({
      job: opts.job,
      service: opts.service,
      slo: Number(opts.slo),
      budgetWindowDays: opts.budgetWindowDays,
      windows
    });
    mkdirSync(dirname(opts.exportPrometheus), { recursive: true });
    writeFileSync(opts.exportPrometheus, yaml, "utf-8");
    console.log(`Prometheus rules written to ${opts.exportPrometheus}`);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});


