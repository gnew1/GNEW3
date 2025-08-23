
# GNEW DevRel Dashboard (N400)

Visual dashboard for Developer Relations KPIs.

## Features
- Connects to DevRel Metrics service (`/api/metrics/quickstarts`).
- Displays quickstart adoption and average T2D latency.
- Auto-refresh every 10 seconds.

## Run locally
```bash
cd apps/devrel-dashboard
pnpm i
pnpm dev

Build
pnpm build

Tests
pnpm test

Deploy

Build as static site (dist/).

Serve behind same domain proxying /api to @gnew/devrel-metrics.


/. github/workflows/devrel-dashboard.yml
```yaml
name: DevRel Dashboard CI
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
      - run: pnpm --filter @gnew/devrel-dashboard i && pnpm --filter @gnew/devrel-dashboard build && pnpm --filter @gnew/devrel-dashboard test


