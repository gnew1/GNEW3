
# GNEW Guild Governance (N407)

**Purpose:** Provide guild-level governance with proposals, voting, and result tallying.

## Endpoints
- `POST /api/governance/proposals` – create proposal
- `GET /api/governance/proposals/:guildId` – list proposals in guild
- `POST /api/governance/proposals/:id/vote` – cast/overwrite a vote
- `GET /api/governance/proposals/:id/results` – view results

## Local Run
```bash
pnpm --filter @gnew/guild-governance dev

Build
pnpm --filter @gnew/guild-governance build

Test
pnpm --filter @gnew/guild-governance test

Deployment

Dockerfile included. Service listens on port 9150 by default.


/github/workflows/guild-governance.yml
```yaml
name: Guild Governance CI
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
      - run: pnpm --filter @gnew/guild-governance i
      - run: pnpm --filter @gnew/guild-governance build
      - run: pnpm --filter @gnew/guild-governance test


