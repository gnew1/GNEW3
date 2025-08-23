# N47 — Visualizar KPIs DAO/Token/Red

**Objetivo:** panel de KPIs (DAO / Token / Red) con filtros y **latencia < 5 s con caché**.  
**Roles:** Data Viz + Frontend.  
**Stack:** React (Next.js 14 App Router) + **Recharts** y **Chart.js**.

## DoD
- Respuesta de `/api/kpi` con **P95 < 5 s** bajo caché de memoria + HTTP (`Cache-Control`, `revalidate`).
- Dashboard interactivo con filtros (rango, chain/network, token), **timeseries**, **barras** y **donut**.
- Fallback **sintético** si no hay fuentes N41; despliegue corre en máquina limpia.

## Quick start
```bash
cd apps/web/kpi-dashboard
pnpm i   # o: npm i / yarn
pnpm dev
# abrir http://localhost:3000/kpi

Variables de entorno
Crea .env.local:
# fuentes (opcional): endpoints internos si existen; si no, usa sintético
N41_BASE=http://localhost:8000
KPI_TTL_SECONDS=60
KPI_SMAXAGE=120

Nota: El API route /api/kpi agrega y cachea datos. Usa LRU en memoria (TTL) + headers HTTP para caches intermedios.

/gnew/apps/web/kpi-dashboard/package.json
```json
{
  "name": "kpi-dashboard",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "dependencies": {
    "chart.js": "^4.4.1",
    "lru-cache": "^10.2.2",
    "next": "14.2.5",
    "react": "18.3.1",
    "react-chartjs-2": "^5.2.0",
    "react-dom": "18.3.1",
    "recharts": "^2.11.0",
    "swr": "^2.2.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.11.25",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.5",
    "typescript": "^5.4.5"
  }
}

