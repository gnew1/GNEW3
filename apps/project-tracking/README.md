
# GNEW Project Tracking (N412)

**Purpose:** Manage and track tasks, milestones, and progress for projects within GNEW guilds.

## Endpoints
- `POST /api/project-tracking/task` – create a task
- `GET /api/project-tracking/:projectId` – list tasks of a project
- `PATCH /api/project-tracking/:taskId/status` – update task status

## Local Run
```bash
pnpm --filter @gnew/project-tracking dev

Build
pnpm --filter @gnew/project-tracking build

Test
pnpm --filter @gnew/project-tracking test

Deployment

Dockerfile included. Default port: 9200


/.github/workflows/project-tracking.yml
```yaml
name: Project Tracking CI
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
      - run: pnpm --filter @gnew/project-tracking i
      - run: pnpm --filter @gnew/project-tracking build
      - run: pnpm --filter @gnew/project-tracking test


