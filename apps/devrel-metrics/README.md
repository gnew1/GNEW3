
# GNEW DevRel Metrics (N399)

**Objective:** instrument DevRel effectiveness via measurable KPIs (e.g. Time‑to‑Demo, quickstart adoption).

## Metrics exposed
- `gnew_quickstart_runs_total{lang}`
- `gnew_quickstart_latency_seconds{lang}`

## Endpoints
- `POST /api/record` → `{ lang, minutes }`
- `GET /metrics` → Prometheus format

## Local run
```bash
pnpm --filter @gnew/devrel-metrics dev

Integration

apps/dev-portal/scripts/t2d-check.js POSTs results to /api/record.

Dashboard (Grafana) can query Prometheus scraping /metrics.

Tests
pnpm --filter @gnew/devrel-metrics test


/apps/dev-portal/scripts/t2d-check.js (patched section)
```js
// after out.minutes calculated
try {
  const fetch = (await import("node-fetch")).default;
  await fetch(process.env.GNEW_METRICS_URL ?? "http://localhost:9090/api/record", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lang: example, minutes: out.minutes }),
  });
} catch (e) {
  console.error("Metrics push failed", e);
}


/. github/workflows/devrel-metrics.yml

name: DevRel Metrics CI
on:
  push: { branches: ["main"] }
  pull_request: {}
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: pnpm --filter @gnew/devrel-metrics i && pnpm --filter @gnew/devrel-metrics build && pnpm --filter @gnew/devrel-metrics test


