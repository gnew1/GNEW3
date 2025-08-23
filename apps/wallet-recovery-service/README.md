
# Wallet Recovery Service – Social Recovery (N152)

> Fuente del prompt: MÓDULO 16 · **N152 16.2 Custodia no-custodia y social recovery**. Objetivo: wallet no‑custodia con recuperación social; **Stack**: Shamir/SSS o guardians N‑of‑M, biometría SO; **Entregables**: flujo de guardians, expiraciones, evidencias; **Pasos**: nominación/rotación, ventana de disputa, auditoría; **DoD**: recuperación validada, registros inmutables; **Controles**: rate limiting, notificaciones multi‑canal. :contentReference[oaicite:0]{index=0}

Este servicio implementa **recuperación social no‑custodia** para wallets:
- Claves del usuario permanecen **locales**; el servicio **no** custodia la seed.
- Se guarda un **KEK** (Key Encryption Key) de recuperación dividido con **Shamir Secret Sharing (t‑of‑n)** entre *guardians*.
- Flujo con **ventana de disputa** y **auditoría inmutable** (hash encadenado).
- **Rate‑limit** por IP/wallet y **notificaciones multi‑canal** (mail/SMS/webhook).

## Endpoints (REST)
- `POST /guardians/nominate` — alta/rotación de guardianes (con expiración).
- `POST /guardians/confirm` — el guardián acepta (firma su share cifrado).
- `GET  /guardians/list?walletId=...`
- `POST /recovery/initiate` — inicia recuperación (define `t` de `n`, ventana de disputa, evidencia).
- `POST /recovery/approve` — guardian envía **approval** (firma + share cifrado).
- `POST /recovery/dispute` — titular cancela dentro de la ventana.
- `POST /recovery/complete` — reconstruye KEK si `t` approvals válidos + ventana expirada.
- `GET  /audit/:walletId` — auditoría apend‑only (hash‑chain).

## Ejecutar
```bash
pnpm i
pnpm build
pnpm start      # PORT=8080 por defecto
pnpm test

Variables

DATABASE_URL (opcional, por defecto sqlite en data/recovery.db)

NOTIFY_EMAIL_FROM, SMTP_URL (opcional)

NOTIFY_TWILIO_* (opcional)

WEBHOOK_URL (opcional)

DoD (match con prompt)

✅ Recuperación validada con pruebas unitarias (reconstrucción t‑of‑n).

✅ Registros inmutables (hash chain) consultables por wallet.

✅ Ventana de disputa y controles de rate limit + notificaciones.


/apps/wallet-recovery-service/package.json
```json
{
  "name": "@gnew/wallet-recovery-service",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand"
  },
  "dependencies": {
    "better-sqlite3": "^9.6.0",
    "commander": "^12.1.0",
    "express": "^4.19.2",
    "nanoid": "^5.0.7",
    "noble-ed25519": "^2.0.0",
    "rate-limiter-flexible": "^5.0.0",
    "secrets.js-grempe": "^2.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^22.5.4",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.4",
    "typescript": "^5.5.4"
  }
}


