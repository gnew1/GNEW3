
# GNEW Guild Messaging (N408)

**Purpose:** Provide secure messaging channels for guild members with WebSocket broadcast and history API.

## Features
- Real-time WebSocket messaging
- REST history endpoint
- Broadcast messages to all connected clients in the guild

## Endpoints
- `GET /api/messages/:guildId` – retrieve history for a guild

## Local Run
```bash
pnpm --filter @gnew/guild-messaging dev

Build
pnpm --filter @gnew/guild-messaging build

Test
pnpm --filter @gnew/guild-messaging test

Deployment

Dockerfile included. Service listens on port 9160 by default.


/.github/workflows/guild-messaging.yml
```yaml
name: Guild Messaging CI
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
      - run: pnpm --filter @gnew/guild-messaging i
      - run: pnpm --filter @gnew/guild-messaging build
      - run: pnpm --filter @gnew/guild-messaging test


