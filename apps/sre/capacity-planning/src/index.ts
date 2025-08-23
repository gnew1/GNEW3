#!/usr/bin/env node
import { Command } from "commander";
import { readConfig, readUsageCsv, groupHistory, writeJson, writeCsv, currentQuarter } from "./io.js";
import { forecastHoltLinear } from "./forecast.js";
import { optimizeReservation } from "./optimize.js";
import { Config, PlanOutput, ServicePlan } from "./models.js";

const program = new Command();

program
  .requiredOption("--usage <path>", "Ruta al CSV de histórico (data/usage.csv)")
  .requiredOption("--config <path>", "Ruta al config.json")
  .option("--outdir <path>", "Directorio de salida", "out");

program.parse(process.argv);
const opts = program.opts<{ usage: string; config: string; outdir: string }>();

(async () => {
  const cfg: Config = readConfig(opts.config);
  const rows = readUsageCsv(opts.usage);

  const services = Object.keys(cfg.services);
  const plans: ServicePlan[] = [];

  for (const s of services) {
    const pricing = cfg.services[s];
    const { values, dates } = groupHistory(rows, s);

    const fc = forecastHoltLinear(values, dates, cfg.alpha, cfg.beta, cfg.horizon);
    const opt = optimizeReservation(fc, pricing);

    plans.push({
      service: s,
      unit: pricing.unit,
      forecast: fc,
      commit: opt.commit,
      costOnDemandOnly: opt.baseline,
      costWithReservation: opt.cost,
      estimatedSavings: opt.savings
    });
  }

  const out: PlanOutput = {
    quarter: currentQuarter(),
    services: plans,
    totalBaseline: plans.reduce((a, p) => a + p.costOnDemandOnly, 0),
    totalWithReservation: plans.reduce((a, p) => a + p.costWithReservation, 0),
    totalSavings: plans.reduce((a, p) => a + p.estimatedSavings, 0)
  };

  const jsonPath = `${opts.outdir}/plan-${out.quarter}.json`;
  const csvPath = `${opts.outdir}/plan-${out.quarter}.csv`;
  writeJson(jsonPath, out);
  writeCsv(csvPath, plans);

  // eslint-disable-next-line no-console
  console.log(`✔ Plan de capacidad escrito en:
- ${jsonPath}
- ${csvPath}`);
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

