# Capacity Planning (N150)

Objetivo: Modelos de demanda y coste con **forecast trimestral** y **reservas optimizadas**.

Este paquete ingiere histórico de uso por servicio (p. ej., vCPU-horas/mes), genera un pronóstico a 3 meses mediante **Holt (tendencia)** y calcula el nivel óptimo de **capacidad reservada** que minimiza coste esperado dado el pricing **On‑Demand vs Reserved**.

## Entradas
- `data/usage.csv` con columnas: `date,service,usage`
  - `date`: ISO (YYYY-MM-DD)
  - `service`: string (compute, db, etc.)
  - `usage`: número (unidad configurable, p. ej. vCPUh/mes)
- `config.json` (pricing y parámetros de forecast/optimización)

## Salidas
- `out/plan-<Q>-<YYYY>.json`: plan trimestral (forecast, reservas, ahorro)
- `out/plan-<Q>-<YYYY>.csv`: resumen tabular

## Comandos
```bash
pnpm i
pnpm build
pnpm start -- --usage data/usage.csv --config config.json
pnpm test

Supuestos

Compromiso de reserva constante para el trimestre (mismo nivel en cada mes).

Coste = reservedRate * commit + onDemandRate * max(0, demand - commit).

Búsqueda discreta del compromiso óptimo con granularidad configurable.

DoD (Definition of Done)

Pronóstico trimestral emitido.

Plan de reservas con cálculo de ahorro estimado.

Pruebas unitarias del optimizador.


# /apps/sre/capacity-planning/package.json
```json
{
  "name": "@gnew/capacity-planning",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js --passWithNoTests"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^22.5.4",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.4",
    "typescript": "^5.5.4"
  }
}

