
# Error Budget Tracker (N151)

Toolkit CLI para **SLO/Burn‑Rate** al estilo SRE. Lee eventos de SLI (availability o latency), calcula
**error rates**, **burn rates** por múltiples ventanas (p. ej. 5m/1h/6h/24h), emite diagnóstico y puede
generar **Alert Rules** de Prometheus con multi‑ventanas.

> Stack: Node 20+, TypeScript 5, pnpm. Entrada CSV grande soportada.

## Entradas
- CSV (`--events`) con encabezados:
  - `ts` (ISO 8601), `success` (`true|false`), `duration_ms` (opcional, numérico para SLI de latencia).
- SLI/SLO por flags CLI:
  - `--sli <availability|latency>`
  - `--threshold-ms <N>` (solo para `latency`)
  - `--slo <porcentaje>` (p. ej. `99.9`)
  - `--window <lista>` lista separada por comas con sufijos `m|h|d` (p. ej. `5m,1h,6h,24h`)
  - `--budget-window-days <N>` ventana presupuestaria del SLO (por defecto 28 días)

## Salidas
- Reporte por stdout con:
  - errores y totales por ventana
  - `error_rate`, `burn_rate = error_rate / (1 - SLO)`
  - recomendación de alerta (según umbrales estándar multi‑ventana)
- (Opcional) `--export-prometheus <ruta.yaml>` para reglas de alerta multi‑ventana.

## Uso
```bash
pnpm i
pnpm build

# Análisis de disponibilidad con ventanas 5m/1h/6h/24h y SLO 99.9 en 28 días
pnpm start -- \
  --events data/sample-events.csv \
  --sli availability \
  --slo 99.9 \
  --window 5m,1h,6h,24h

# Latencia p90 bajo 300 ms (good if duration_ms <= 300)
pnpm start -- \
  --events data/sample-events.csv \
  --sli latency --threshold-ms 300 \
  --slo 99.5 \
  --window 5m,1h,24h \
  --export-prometheus out/rules.yaml

Modelo de Alertas (por defecto)

Usa dos niveles, inspirados en prácticas SRE:

P1 (page): short y long simultáneas (p. ej. 5m >= 14.4× y 1h >= 6×).

P2 (ticket): medium y long (p. ej. 1h >= 3× y 6h >= 1×).

Reglas ajustan dinámicamente según SLO y budget_window_days.

DoD

Cálculo correcto de error y burn rate en múltiples ventanas.

Exportación de reglas Prometheus parametrizadas.

Pruebas unitarias de burn‑rate.


/apps/sre/error-budget-tracker/package.json
```json
{
  "name": "@gnew/error-budget-tracker",
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
    "csv-parse": "^5.5.6",
    "date-fns": "^3.6.0",
    "yaml": "^2.5.1"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^22.5.4",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.4",
    "typescript": "^5.5.4"
  }
}


