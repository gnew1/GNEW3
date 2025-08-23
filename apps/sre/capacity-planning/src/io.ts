import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Config, UsageRow, ForecastPoint, PlanOutput, ServicePlan } from "./models.js";
import { parseISO } from "date-fns";

export function readConfig(path: string): Config {
  const raw = readFileSync(path, "utf-8");
  const cfg = JSON.parse(raw) as Config;
  return cfg;
}

export function readUsageCsv(path: string): UsageRow[] {
  const raw = readFileSync(path, "utf-8").trim();
  const [headerLine, ...lines] = raw.split(/\r?\n/);
  const headers = headerLine.split(",").map(h => h.trim());
  const idxDate = headers.indexOf("date");
  const idxService = headers.indexOf("service");
  const idxUsage = headers.indexOf("usage");
  if (idxDate < 0 || idxService < 0 || idxUsage < 0) {
    throw new Error("CSV must include headers: date,service,usage");
  }
  return lines.filter(Boolean).map(line => {
    const cols = line.split(",").map(c => c.trim());
    return {
      date: cols[idxDate],
      service: cols[idxService],
      usage: Number(cols[idxUsage])
    };
  });
}

export function groupHistory(rows: UsageRow[], service: string): { values: number[]; dates: Date[] } {
  const filtered = rows.filter(r => r.service === service).sort((a, b) => a.date.localeCompare(b.date));
  if (!filtered.length) throw new Error(`No usage rows for service "${service}".`);
  const values = filtered.map(r => r.usage);
  const dates = filtered.map(r => parseISO(r.date));
  return { values, dates };
}

export function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

export function writeJson(path: string, data: unknown) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

export function writeCsv(path: string, plans: ServicePlan[]) {
  ensureDir(dirname(path));
  const header = "service,unit,period,forecast,commit,cost_baseline,cost_with_reservation,savings";
  const lines = [header];
  for (const p of plans) {
    for (const f of p.forecast) {
      lines.push(
        [
          p.service,
          p.unit,
          f.period,
          f.usage.toFixed(2),
          p.commit.toFixed(0),
          p.costOnDemandOnly.toFixed(2),
          p.costWithReservation.toFixed(2),
          p.estimatedSavings.toFixed(2)
        ].join(",")
      );
    }
  }
  writeFileSync(path, lines.join("\n"), "utf-8");
}

export function currentQuarter(d = new Date()): string {
  const month = d.getUTCMonth(); // 0-11
  const q = Math.floor(month / 3) + 1;
  return `Q${q}-${d.getUTCFullYear()}`;
}

