
# GNEW Project Launcher (N411)

**Purpose:** Manage launching of new projects proposed by guild members.

## Endpoints
- `POST /api/projects` – launch a new project
- `GET /api/projects/:id` – get project by ID
- `GET /api/projects/guild/:guildId` – list projects in a guild
- `POST /api/projects/:id/complete` – mark project completed

## Local Run
```bash
pnpm --filter @gnew/project-launcher dev

Build
pnpm --filter @gnew/project-launcher build

Test
pnpm --filter @gnew/project-launcher test

Deployment

Dockerfile included. Service runs on port 9190 by default.


/github/workflows/project-launcher.yml
```yaml
name: Project Launcher CI
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
      - run: pnpm --filter @gnew/project-launcher i
      - run: pnpm --filter @gnew/project-launcher build
      - run: pnpm --filter @gnew/project-launcher test


