
# Búsqueda Semántica RAG con Citaciones (N168)

> **Objetivo (Prompt 168)**: Buscar en documentos *(y fuentes on‑chain ingeridas como documentos)* usando **embeddings** y devolver **fragmentos** con **citaciones**.  
> **Stack**: `pgvector` (o FAISS alternativo), chunking, Express API + UI mínima con fuentes.

## Capacidades
- **Ingesta** de documentos (`/ingest`) con *chunking* y embeddings.
- **Búsqueda** semántica (`/search`) con **citaciones** (título, URI, rango de chunk).
- **On‑chain como fuente**: metadatos opcionales `onchain` anexados al documento.
- **Proveedor de embeddings** intercambiable:
  - `local` (hashing semántico determinista, sin dependencias externas).
  - `openai` (si defines `OPENAI_API_KEY`, usa `text-embedding-3-small`, 1536‑d).
- **pgvector** con índice `ivfflat` para latencias < 1s.

## Endpoints
- `POST /ingest` — `{ title, sourceUri, text? , chunks? , onchain? }`
- `GET  /search?q=...&k=5` — resultados con `{ content, similarity, citation }`
- `GET  /docs/:id` — metadatos del documento + chunks.
- `GET  /healthz`

## Variables de entorno
- `PORT` (default `8102`)
- `DATABASE_URL` (ej. `postgres://user:pass@localhost:5432/gnew`)
- `EMBEDDINGS_PROVIDER` = `local` | `openai` (default `local`)
- `VECTOR_DIM` = `384` (local) o `1536` (openai)
- `OPENAI_API_KEY` (si usas `openai`)

> Requiere `CREATE EXTENSION IF NOT EXISTS vector;` en tu Postgres.

## Uso rápido
```bash
pnpm i
pnpm -C apps/search/rag-service build
pnpm -C apps/search/rag-service start

# Ingesta
curl -s localhost:8102/ingest -H 'Content-Type: application/json' -d @- <<'JSON'
{
  "title": "Política de Privacidad v2",
  "sourceUri": "https://example.com/policy-v2",
  "text": "La presente política... (contenido largo a indexar)"
}
JSON

# Búsqueda
curl -s 'http://localhost:8102/search?q=datos personales&k=5' | jq

Índices pgvector
CREATE EXTENSION IF NOT EXISTS vector;
-- crear tabla con dimensión acorde a VECTOR_DIM (ver migración dinámica en el servicio)
CREATE INDEX IF NOT EXISTS ix_chunks_vec ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
ANALYZE chunks;

UI

Cliente React simple en /apps/search/rag-web que consulta GET /search y muestra citaciones enlazables.


/apps/search/rag-service/package.json
```json
{
  "name": "@gnew/rag-service",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "node --watch dist/index.js",
    "migrate": "node dist/migrate.js",
    "lint": "echo 'ok'"
  },
  "dependencies": {
    "express": "^4.19.2",
    "nanoid": "^5.0.7",
    "pg": "^8.12.0",
    "pgvector": "^0.1.8",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.5.4",
    "typescript": "^5.5.4"
  }
}


