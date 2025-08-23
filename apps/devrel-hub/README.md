
# GNEW DevRel Hub (N400)

**Objective:** Centralize all DevRel resources: tutorials, blog posts, metrics dashboards, community content.

## Features
- **Tutorials** list from `/api/tutorials`
- **Blog** (placeholder for Markdown posts)
- **Metrics** dashboard proxying `/metrics` from `@gnew/devrel-metrics`

## Local run
```bash
pnpm --filter @gnew/devrel-hub dev

CI

vitest tests under tests/

GitHub Action ensures build+test passes


/.github/workflows/devrel-hub.yml
```yaml
name: DevRel Hub CI
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
      - run: pnpm --filter @gnew/devrel-hub i
      - run: pnpm --filter @gnew/devrel-hub build
      - run: pnpm --filter @gnew/devrel-hub test


