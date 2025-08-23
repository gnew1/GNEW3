
# GNEW Reward Distribution (N407)

**Purpose:** Manage distribution of Gnew tokens and Gnew0 time credits to guild members.

## Endpoints
- `POST /api/rewards` – distribute reward `{ id, guildId, memberId, token, amount }`
- `GET /api/rewards/:guildId` – rewards issued within a guild
- `GET /api/rewards/:guildId/:memberId` – rewards received by a member

## Local Run
```bash
pnpm --filter @gnew/reward-distribution dev

Build
pnpm --filter @gnew/reward-distribution build

Test
pnpm --filter @gnew/reward-distribution test

Deployment

Dockerfile provided. Service runs on port 9150 by default.


/.github/workflows/reward-distribution.yml
```yaml
name: Reward Distribution CI
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
      - run: pnpm --filter @gnew/reward-distribution i
      - run: pnpm --filter @gnew/reward-distribution build
      - run: pnpm --filter @gnew/reward-distribution test


