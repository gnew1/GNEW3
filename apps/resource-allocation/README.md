
# GNEW Resource Allocation (N411)

**Purpose:** Provide a service to allocate resources (time, tokens, compute) to projects within guilds.

## Endpoints
- `POST /api/resource-allocation` – create new allocation
- `GET /api/resource-allocation/:guildId` – list allocations by guild
- `GET /api/resource-allocation/project/:projectId` – list allocations by project

## Local Run
```bash
pnpm --filter @gnew/resource-allocation dev

Build
pnpm --filter @gnew/resource-allocation build

Test
pnpm --filter @gnew/resource-allocation test

Deployment

Dockerfile included. Default port: 9190


/.github/workflows/resource-allocation.yml
```yaml
name: Resource Allocation CI
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
      - run: pnpm --filter @gnew/resource-allocation i
      - run: pnpm --filter @gnew/resource-allocation build
      - run: pnpm --filter @gnew/resource-allocation test


