
# GNEW Member Reputation (N406)

**Purpose:** Track member reputation across guilds based on contributions and peer evaluations.

## Endpoints
- `POST /api/reputation` – record reputation event `{ memberId, guildId, score, reason }`
- `GET /api/reputation/:guildId/:memberId` – member reputation total & history
- `GET /api/reputation/:guildId` – leaderboard per guild

## Local Run
```bash
pnpm --filter @gnew/member-reputation dev

Build
pnpm --filter @gnew/member-reputation build

Test
pnpm --filter @gnew/member-reputation test

Deployment

Dockerfile included. Service listens on port 9140 by default.


/.github/workflows/member-reputation.yml
```yaml
name: Member Reputation CI
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
      - run: pnpm --filter @gnew/member-reputation i
      - run: pnpm --filter @gnew/member-reputation build
      - run: pnpm --filter @gnew/member-reputation test


