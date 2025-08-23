
# GNEW Task Assignment (N408)

**Purpose:** Provide task management inside guilds – creation, assignment, completion.

## Endpoints
- `POST /api/tasks` – create task
- `POST /api/tasks/:id/assign` – assign to a member
- `POST /api/tasks/:id/complete` – mark done
- `GET /api/tasks/:guildId` – list guild tasks

## Local Run
```bash
pnpm --filter @gnew/task-assignment dev

Build
pnpm --filter @gnew/task-assignment build

Test
pnpm --filter @gnew/task-assignment test

Deployment

Dockerfile included. Service runs on port 9160 by default.


/.github/workflows/task-assignment.yml
```yaml
name: Task Assignment CI
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
      - run: pnpm --filter @gnew/task-assignment i
      - run: pnpm --filter @gnew/task-assignment build
      - run: pnpm --filter @gnew/task-assignment test


