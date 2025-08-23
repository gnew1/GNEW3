
# GNEW Guild Voting (N403)

**Purpose:** Enable democratic decisions inside each guild. Supports proposals, member voting, and tallying results.

## Endpoints
- `POST /api/proposals` – create a proposal
- `GET /api/proposals` – list all
- `POST /api/proposals/:id/vote` – cast/overwrite a vote `{ memberId, option }`
- `GET /api/proposals/:id/results` – tally votes

## Local Run
```bash
pnpm --filter @gnew/guild-voting dev

Build
pnpm --filter @gnew/guild-voting build

Test
pnpm --filter @gnew/guild-voting test

Deployment

Dockerfile provided. Service runs at port 9110.


/.github/workflows/guild-voting.yml
```yaml
name: Guild Voting CI
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
      - run: pnpm --filter @gnew/guild-voting i
      - run: pnpm --filter @gnew/guild-voting build
      - run: pnpm --filter @gnew/guild-voting test


