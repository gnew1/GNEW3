
# GNEW Community Forum (N401)

**Objective:** Create a minimal community forum inside GNEW ecosystem.

## Features
- List threads
- Create new threads
- View posts inside a thread
- API routes backed by in-memory storage (demo)

## Local run
```bash
pnpm --filter @gnew/community-forum dev

Tests
pnpm --filter @gnew/community-forum test

Deploy

Next.js app built into .next/ static output

Dockerfile ready for deployment


/.github/workflows/community-forum.yml
```yaml
name: Community Forum CI
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
      - run: pnpm --filter @gnew/community-forum i
      - run: pnpm --filter @gnew/community-forum build
      - run: pnpm --filter @gnew/community-forum test


