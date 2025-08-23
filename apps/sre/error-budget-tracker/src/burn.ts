
import { AnalysisInput, AnalysisOutput, EventRow, WindowSpec, WindowStats } from "./models.js";

function windowSince(now: Date, w: WindowSpec) {
  return new Date(now.getTime() - w.ms);
}

function classifyEvent(e: EventRow, sli: "availability" | "latency", thresholdMs?: number): { good: boolean } {
  if (sli === "availability") {
    return { good: e.success === true };
  }
  // latency SLI: good if success AND duration_ms <= threshold
  if (thresholdMs === undefined) throw new Error("thresholdMs is required for latency SLI");
  const good = e.success === true && typeof e.duration_ms === "number" && e.duration_ms <= thresholdMs;
  return { good };
}

export function analyze(input: AnalysisInput, now = new Date()): AnalysisOutput {
  const errorBudget = 1 - input.slo / 100.0;
  const outWindows: WindowStats[] = [];

  for (const w of input.windows) {
    const from = windowSince(now, w).getTime();
    let good = 0, bad = 0, total = 0;

    // binary scan (events sorted)
    for (let i = input.events.length - 1; i >= 0; i--) {
      const ev = input.events[i];
      const t = ev.ts.getTime();
      if (t < from) break;
      const c = classifyEvent(ev, input.sli, input.thresholdMs);
      if (c.good) good++; else bad++;
      total++;
    }

    const errorRate = total > 0 ? bad / total : 0;
    const burnRate = errorBudget > 0 ? errorRate / errorBudget : Infinity;

    outWindows.push({
      window: w,
      good, bad, total, errorRate, burnRate
    });
  }

  // Recommendations based on common SRE multi-window heuristics.
  // We generalize thresholds relative to budget window (default 28d):
  // P1 (page): short >= 14.4x && long >= 6x
  // P2 (ticket): medium >= 3x && long >= 1x
  // We choose: short = minimum window, medium = median, long = maximum.
  const sorted = [...outWindows].sort((a, b) => a.window.ms - b.window.ms);
  const short = sorted[0];
  const long = sorted[sorted.length - 1];
  const medium = sorted[Math.floor(sorted.length / 2)];

  const p1 = (short?.burnRate ?? 0) >= 14.4 && (long?.burnRate ?? 0) >= 6.0;
  const p2 = (medium?.burnRate ?? 0) >= 3.0 && (long?.burnRate ?? 0) >= 1.0;

  const detail: string[] = [];
  if (p1) detail.push(`P1: short ${short.burnRate.toFixed(2)}x & long ${long.burnRate.toFixed(2)}x`);
  if (!p1 && p2) detail.push(`P2: med ${medium.burnRate.toFixed(2)}x & long ${long.burnRate.toFixed(2)}x`);
  if (!p1 && !p2) detail.push("Healthy: burn within budget across windows");

  return {
    nowISO: now.toISOString(),
    slo: input.slo,
    errorBudget,
    windows: outWindows,
    recommendations: {
      page: p1,
      ticket: !p1 && p2,
      detail
    }
  };
}


