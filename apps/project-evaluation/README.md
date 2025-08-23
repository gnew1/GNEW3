
# GNEW Project Evaluation (N413)

**Purpose:** Enable structured evaluation of projects by guild members, to improve accountability and transparency.

## Endpoints
- `POST /api/project-evaluation` – submit evaluation
- `GET /api/project-evaluation/:projectId` – list evaluations for a project
- `GET /api/project-evaluation/:projectId/aggregate` – get average score and count

## Local Run
```bash
pnpm --filter @gnew/project-evaluation dev

Build
pnpm --filter @gnew/project-evaluation build

Test
pnpm --filter @gnew/project-evaluation test

Deployment

Dockerfile included. Default port: 9210


/.github/workflows/project-evaluation.yml
```yaml
name: Project Evaluation CI
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
      - run: pnpm --filter @gnew/project-evaluation i
      - run: pnpm --filter @gnew/project-evaluation build
      - run: pnpm --filter @gnew/project-evaluation test


