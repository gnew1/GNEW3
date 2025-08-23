
# GNEW Reputation System (N410)

**Purpose:** Track and manage reputation points of guild members based on contributions.

## Endpoints
- `POST /api/reputation/update` – apply delta to a member’s reputation
- `GET /api/reputation/:guildId/:memberId` – get reputation of a member
- `GET /api/reputation/:guildId` – leaderboard of a guild

## Local Run
```bash
pnpm --filter @gnew/reputation-system dev

Build
pnpm --filter @gnew/reputation-system build

Test
pnpm --filter @gnew/reputation-system test

Deployment

Dockerfile included. Service runs on port 9180 by default.


/.github/workflows/reputation-system.yml
```yaml
name: Reputation System CI
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
      - run: pnpm --filter @gnew/reputation-system i
      - run: pnpm --filter @gnew/reputation-system build
      - run: pnpm --filter @gnew/reputation-system test


