
# CDN Gateway & Edge Compute (N163)

> **Objetivo**: puerta de enlace **edge** (Cloudflare Workers) con **cache**, **signed URLs**, **image resizing**, **geo-fencing**, **A/B testing** y **soft‑purge por tags**.  
> **Stack**: Cloudflare Workers (TypeScript), KV para metadatos (versionado de tags), configurable por `wrangler.toml`.  
> **Control plane**: servicio Node/Express para **firmado**, **rotación de claves** y **purges** (ver `/apps/edge/control-plane`).

## Capacidades
- **Proxy** de origen (`/edge/proxy/*`) con verificación de **signed URL** (`sig`,`exp`,`key`).
- **Cache** con SWR (cabeceras), `cacheEverything`, `cacheKey` con **tag version** (`KV`).
- **Soft‑purge por tag** (`/edge/purge?tag=...`), requiere `x-admin-token`.
- **Image resize** (`/edge/image?url=...&w=...&h=...&q=...`) usando `cf.image`.
- **Geo-fencing** (`/edge/geo-block?block=CN,RU`) y **A/B testing** (`/edge/ab?exp=banner` cookie estable).
- **Gateways** minimal: `/edge/health`.

## Variables (Wrangler)
- `ORIGIN_URL` — origen (e.g. `https://origin.example.com`)
- `REQUIRE_SIGNED` — `"1"` para exigir firma en `/edge/proxy/*`
- `SIGNING_KEYS_JSON` — JSON `{ "kid1": "base64url(hmacKey)", "kid2": "..." }`
- `ADMIN_TOKEN` — token para `/edge/purge`
- `CDN_META` — binding KV p/ tags (`CDN_META` en `wrangler.toml`)

## Run
```bash
pnpm i
pnpm -C apps/edge/cdn-gateway build
pnpm -C apps/edge/cdn-gateway dev
# o
pnpm -C apps/edge/cdn-gateway deploy

Soft‑purge por tag

Las respuestas cacheadas pueden ir etiquetadas con x-cache-tag: blog (o ?tag=blog).

El cacheKey incluye v=<KV:tag:v:blog>; al purgar se incrementa y provoca miss en peticiones futuras.

Ejemplos

GET /edge/proxy/assets/app.css?tag=ui&sig=...&exp=1699999999&key=kid1

POST /edge/purge?tag=ui con x-admin-token: <ADMIN_TOKEN>

GET /edge/image?url=https://.../photo.jpg&w=800&q=75


/apps/edge/cdn-gateway/package.json
```json
{
  "name": "@gnew/cdn-gateway",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240222.0",
    "typescript": "^5.5.4",
    "wrangler": "^3.74.0"
  }
}


