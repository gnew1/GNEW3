
# GNEW Identity Verification (N419)

**Purpose:** Provide secure identity verification for GNEW DAO members using TOTP-based 2FA.  

## Endpoints
- `POST /api/verify/init` – initialize 2FA for a user (returns secret + QR)
- `POST /api/verify/check` – validate a TOTP token
- `GET /api/verify/status/:userId` – get verification status

## Run Locally
```bash
pnpm --filter @gnew/identity-verification dev

Build
pnpm --filter @gnew/identity-verification build

Test
pnpm --filter @gnew/identity-verification test

Deploy

Dockerfile included. Default port: 9270.


/docker/identity-verification.Dockerfile  
```dockerfile
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/identity-verification... && pnpm --filter @gnew/identity-verification build
EXPOSE 9270
CMD ["node","apps/identity-verification/dist/server.js"]


