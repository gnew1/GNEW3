
# Motor de Facturación Fiscal Multi‑país (N156)

> Prompt **N156 · 16.6 Facturación fiscal avanzada multipaís** — Impuestos por país, retenciones y e‑invoicing.  
> Stack: **Motor fiscal**, plantillas por jurisdicción, **firma**.  
> Entregables: **motor de reglas**, **validaciones**, export **XBRL/SAF‑T**.  
> DoD: **validadores oficiales OK**, **numeración** y **archivo legal**. :contentReference[oaicite:0]{index=0}

Este servicio implementa:
- **Motor fiscal** con **reglas por país** (ES/PT/US demo) y **retenciones** (p. ej., IRPF profesionales).
- **Numeración legal** por series/jurisdicción/año (`ES‑2025‑A‑000123`).
- **E‑invoicing**: export **UBL 2.1 (Invoice)** + **firma** (JWS sobre XML canónico).
- **Exports regulatorios**: **SAF‑T** (OECD) y **XBRL** (resumen fiscal).
- **Archivo inmutable** (hash encadenado) y validaciones (Zod + reglas).

> Nota: N104 ya introducía facturación electrónica básica; aquí se **extiende** a multipaís con **SAF‑T/XBRL** y motor avanzado. :contentReference[oaicite:1]{index=1}

## Endpoints
- `POST /series` — crea/consulta series de numeración.
- `POST /customers` — alta de cliente.
- `POST /invoices` — crea factura (aplica reglas fiscales del país).
- `GET  /invoices/:id` — consulta.
- `GET  /export/ubl/:id` — descarga UBL XML + firma JWS.
- `GET  /export/saft?country=ES&year=2025` — SAF‑T XML.
- `GET  /export/xbrl?country=ES&period=2025-Q3` — XBRL (resumen IVA/retenciones).
- `GET  /archive/:scopeId` — auditoría (hash‑chain).

## Ejecutar
```bash
pnpm i
pnpm -C apps/tax/multicountry-invoicing build
pnpm -C apps/tax/multicountry-invoicing start
# Probar
curl -s localhost:8090/healthz

Variables

PORT (por defecto 8090)

DATABASE_URL (sqlite por defecto en data/tax.db)

SIGNING_PRIVATE_KEY_PEM (opcional; RSA o EC en PEM para firmar UBL → JWS)

DoD (mapeado)

✅ Motor de reglas por jurisdicción con retenciones y IVA/IVA‑like.

✅ Numeración legal y archivo apend‑only.

✅ UBL, SAF‑T y XBRL mínimos interoperables.

✅ Validaciones: esquemas sintácticos y de negocio.


/apps/tax/multicountry-invoicing/package.json
```json
{
  "name": "@gnew/multicountry-invoicing",
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
    "date-fns": "^3.6.0",
    "express": "^4.19.2",
    "nanoid": "^5.0.7",
    "xmlbuilder2": "^3.1.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^22.5.4",
    "jest": "^29.7.0",
    "typescript": "^5.5.4"
  }
}


