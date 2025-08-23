
# GNEW Guild Registry (N402)

**Purpose:** Maintain registry of GNEW guilds, their specialties, and elected representatives.

## Endpoints
- `POST /api/guilds` – register a new guild
- `GET /api/guilds` – list guilds
- `POST /api/guilds/:id/representative` – assign/update representative

## Local Run
```bash
pnpm --filter @gnew/guild-registry dev

Build
pnpm --filter @gnew/guild-registry build

Test
pnpm --filter @gnew/guild-registry test

Deployment

Dockerfile included. Service listens on port 9100 by default.


/.github/workflows/guild-registry.yml
```yaml
name: Guild Registry CI
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
      - run: pnpm --filter @gnew/guild-registry i
      - run: pnpm --filter @gnew/guild-registry build
      - run: pnpm --filter @gnew/guild-registry test


