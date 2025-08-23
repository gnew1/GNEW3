
# GNEW KPI Tracker (N404)

**Purpose:** Provide an API to record and query productivity KPIs for guilds and committees.

## Endpoints
- `POST /api/kpis` – record KPI `{ guildId, metric, value }`
- `GET /api/kpis` – list all
- `GET /api/kpis/:guildId` – list KPIs by guild

## Local Run
```bash
pnpm --filter @gnew/kpi-tracker dev

Build
pnpm --filter @gnew/kpi-tracker build

Test
pnpm --filter @gnew/kpi-tracker test

Deployment

Dockerfile included. Service listens on port 9120 by default.


/.github/workflows/kpi-tracker.yml
```yaml
name: KPI Tracker CI
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
      - run: pnpm --filter @gnew/kpi-tracker i
      - run: pnpm --filter @gnew/kpi-tracker build
      - run: pnpm --filter @gnew/kpi-tracker test


