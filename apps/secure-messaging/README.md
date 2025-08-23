
# GNEW Secure Messaging (N416)

**Purpose:** Provide secure encrypted communication between members using NaCl public key cryptography.

## Endpoints
- `POST /api/secure/register/:userId` – register user with keypair
- `POST /api/secure/send` – send encrypted message
- `GET /api/secure/inbox/:userId` – retrieve encrypted inbox

## Local Run
```bash
pnpm --filter @gnew/secure-messaging dev

Build
pnpm --filter @gnew/secure-messaging build

Test
pnpm --filter @gnew/secure-messaging test

Deployment

Dockerfile included. Default port: 9240


/.github/workflows/secure-messaging.yml
```yaml
name: Secure Messaging CI
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
      - run: pnpm --filter @gnew/secure-messaging i
      - run: pnpm --filter @gnew/secure-messaging build
      - run: pnpm --filter @gnew/secure-messaging test


