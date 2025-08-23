
# GNEW Voting Analytics (N409)

**Purpose:** Provide analytics service to aggregate voting data across proposals and guilds.

## Endpoints
- `POST /api/voting-analytics/vote` – record a vote (for analytics)
- `GET /api/voting-analytics/:guildId` – tally results for a guild
- `GET /api/voting-analytics/proposal/:proposalId` – tally results for a proposal

## Local Run
```bash
pnpm --filter @gnew/voting-analytics dev

Build
pnpm --filter @gnew/voting-analytics build

Test
pnpm --filter @gnew/voting-analytics test

Deployment

Dockerfile included. Service runs on port 9170 by default.


/.github/workflows/voting-analytics.yml
```yaml
name: Voting Analytics CI
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
      - run: pnpm --filter @gnew/voting-analytics i
      - run: pnpm --filter @gnew/voting-analytics build
      - run: pnpm --filter @gnew/voting-analytics test


