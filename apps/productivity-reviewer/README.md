
# GNEW Productivity Reviewer (N405)

**Purpose:** Allow guild members to review each other's productivity with scores and qualitative feedback.

## Endpoints
- `POST /api/reviews` – submit review `{ id, guildId, reviewer, reviewee, score, feedback }`
- `GET /api/reviews/:guildId` – list reviews for a guild
- `GET /api/reviews/:guildId/aggregate` – average scores per member

## Local Run
```bash
pnpm --filter @gnew/productivity-reviewer dev

Build
pnpm --filter @gnew/productivity-reviewer build

Test
pnpm --filter @gnew/productivity-reviewer test

Deployment

Dockerfile included. Service listens on port 9130.


/.github/workflows/productivity-reviewer.yml
```yaml
name: Productivity Reviewer CI
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
      - run: pnpm --filter @gnew/productivity-reviewer i
      - run: pnpm --filter @gnew/productivity-reviewer build
      - run: pnpm --filter @gnew/productivity-reviewer test


