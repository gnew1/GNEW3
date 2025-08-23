
# Anti‑Bribery & Vote‑Buying Detector (N172)

> **Prompt N172 — “Anti‑bribery y detección de compra de votos”**  
> **Objetivo:** Señales de coacción/compra de votos en votaciones on‑chain.  
> **Roles:** Seguridad, Data.  
> **Stack:** Graph analytics + heurísticas on‑chain (EVM), Express API, SQLite (WAL).  
> **Entregables:** detector + alertas.  
> **DoD:** endpoint de evaluación con *precision/recall* ≥ umbral objetivo configurable.

## Qué hace
- **Ingesta on‑chain** (o *batch*) de:
  - **Votos** (`proposalId`, `voter`, `choice`, `txHash`, `ts`).
  - **Transfers** (token nativo y ERC‑20) con `from`, `to`, `value`, `token`.
- **Construye un grafo** `address → address` y calcula *features* por ventana temporal alrededor del voto.
- **Heurísticas** de *vote‑buying*:
  1) **Funding‑Before‑Vote**: entrada de fondos desde *hubs* hacia el votante en `[-Tpre, 0)` minutos.  
  2) **Return‑Flow**: salida del votante hacia el mismo *hub* en `(0, Tpost]`.  
  3) **Fan‑out Hub**: una misma entidad financia **N** votantes distintos en ventana.  
  4) **Fresh Wallet**: edad de la cuenta baja y sin historial previo.  
  5) **Gas‑Payer Pattern**: dirección A paga gas por múltiples votantes (si `tx.from != voter` o si hay *sponsor*).
  6) **Escrow‑like**: interacciones con contratos marcados como *escrow/claim* (lista configurable por patrón de eventos).
- **Scoring** ponderado → `score ∈ [0,1]` + **alertas** con explicación y evidencias.
- **Evaluación**: subir dataset etiquetado y obtener `precision/recall/F1` por *threshold*.

## Endpoints
- `POST /ingest/vote` — 1 voto.  
- `POST /ingest/votes` — batch de votos.  
- `POST /ingest/transfers` — batch de transfers.  
- `POST /detect/run` — ejecuta detección (por `proposalId` o rango de tiempo).  
- `GET  /alerts?proposalId=...` — lista de alertas.  
- `GET  /entities/:address` — features y enlaces en el grafo.  
- `POST /evaluate` — `{ labels:[{voter,proposalId,label:0|1}], threshold? }` → métricas.  
- `GET  /healthz` — ok.

## Config (env)
```env
PORT=8120
DATABASE_URL=data/anti_bribery.db

# Ventanas
PRE_MIN=60           # minutos antes del voto
POST_MIN=180        # minutos después del voto

# Pesos heurísticos (0..1)
W_FUNDING_PRE=0.35
W_RETURN_FLOW=0.3
W_FAN_OUT=0.2
W_FRESH=0.1
W_GAS_PAYER=0.05
W_ESCROW=0.15

# Umbral alerta
ALERT_THRESHOLD=0.65

Run
pnpm i
pnpm -C apps/governance/anti-bribery-detector build
pnpm -C apps/governance/anti-bribery-detector start

# Ingesta mínima
curl -s -X POST localhost:8120/ingest/vote -H 'Content-Type: application/json' -d '{
  "proposalId":"42","voter":"0xVoter1","choice":"for","txHash":"0xabc","ts": 1724131200
}'
curl -s -X POST localhost:8120/ingest/transfers -H 'Content-Type: application/json' -d '{
  "items":[
    {"from":"0xHub","to":"0xVoter1","value":"100", "token":"ETH","ts":1724130000},
    {"from":"0xVoter1","to":"0xHub","value":"90", "token":"ETH","ts":1724131800}
  ]
}'

# Detectar para proposal 42
curl -s -X POST localhost:8120/detect/run -H 'Content-Type: application/json' -d '{"proposalId":"42"}' | jq

# Ver alertas
curl -s 'localhost:8120/alerts?proposalId=42' | jq

Diseño

SQLite en WAL; tablas normalizadas para transfers, votes, entities, edges, alerts.

Grafo dirigido con edge features: suma de valores, conteo, recency; node features: edad, actividad, fan‑in/out.

Detección basada en reglas → score agregando pesos; fácil de extender a un clasificador posterior.

Explainability: cada alerta incluye desglose de pesos y evidencias (tx/ventanas).

Listo para integrarse con pipelines ETL (ingesta batch) o listeners on‑chain (agregar adaptador a un RPC EVM).


/apps/governance/anti-bribery-detector/package.json
```json
{
  "name": "@gnew/anti-bribery-detector",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "node --watch dist/index.js",
    "test": "node --test"
  },
  "dependencies": {
    "better-sqlite3": "^9.6.0",
    "express": "^4.19.2",
    "nanoid": "^5.0.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.5.4",
    "typescript": "^5.5.4"
  }
}


