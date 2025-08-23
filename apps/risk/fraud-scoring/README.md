
# Fraud Signals & Risk Scoring (N159)

Servicio de **señales de fraude** y **scoring de riesgo** en tiempo real.

> Stack: Node 20+, TypeScript 5, Express, SQLite (WAL), pnpm.  
> Enfoque: **feature store** + **reglas** + **modelo logístico** (coeficientes embebidos) + **política** (allow/review/block).  
> Integración: SDK `@gnew/risk-client`.

## Capacidades
- Extracción de **features**: velocidad IP/device, distancia geo, dominios email, BIN y país de tarjeta, histórico del usuario, hora/día, importe (log).
- **Modelo logístico** con explicación por contribución (top‑weights).
- **Política** parametrizable (umbrales + hard rules).
- **Listas** (deny/allow) por IP, email, BIN, device.
- **Persistencia** de eventos, etiquetas (`legit|fraud`), y contadores con ventanas (1h/24h/30d).
- **Auditoría** apend‑only (hash‑chain).
- Export **CSV** de decisiones.

## Endpoints
- `POST /events/score` — puntúa un evento y devuelve `{score, decision, reasons, features, id}`.
- `GET  /events/:id` — consulta evento.
- `GET  /events/export?since=...&until=...&format=csv|json`
- `POST /labels` — registra etiqueta `{ eventId, label: legit|fraud, source }`.
- `GET  /policy` / `POST /policy` — ver/actualizar umbrales y hard rules.
- `GET  /models` — info del modelo activo.
- `GET  /explain/:id` — desglosa contribuciones (feature * weight).
- `POST /lists/upsert` — gestionar listas `{ list:'deny|allow', kind:'ip|email|bin|device', value, note? }`.

## Ejecución
```bash
pnpm i
pnpm -C apps/risk/fraud-scoring build
pnpm -C apps/risk/fraud-scoring start
# Prueba rápida
curl -s localhost:8086/healthz

Variables

PORT (por defecto 8086)

DATABASE_URL (por defecto data/risk.db)

DoD

Score reproducible y explicable, con decisión consistente según política.

Señales principales implementadas y persistidas.

Pruebas unitarias del modelo y la política.

Export y auditoría funcionando.


/apps/risk/fraud-scoring/package.json
```json
{
  "name": "@gnew/fraud-scoring",
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
    "geoip-lite": "^1.4.10",
    "nanoid": "^5.0.7",
    "ua-parser-js": "^1.0.39",
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


