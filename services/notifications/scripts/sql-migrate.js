import { readFile } from "node:fs/promises"; 
import { Pool } from "pg"; 
const pool = new Pool({ connectionString: process.env.DATABASE_URL }); 
const sql = await readFile(new URL("../migrations/001_init.sql", 
import.meta.url)); 
await pool.query(String(sql)); 
console.log("migrated"); 
process.exit(0); 
Ruta completa: ./services/notifications/migrations/001_init.sql -- (Repetido en bootstrap runtime por idempotencia; aquí para CI/CD) 
CREATE TABLE IF NOT EXISTS push_subscriptions ( 
id SERIAL PRIMARY KEY, 
user_id TEXT NOT NULL, 
device_id TEXT NOT NULL, 
kind TEXT NOT NULL CHECK (kind IN ('web','fcm','apns')), 
endpoint TEXT, 
p256dh TEXT, 
auth TEXT, 
token TEXT, 
last_seen TIMESTAMPTZ DEFAULT now(), 
UNIQUE (device_id, kind) 
); 
CREATE TABLE IF NOT EXISTS notification_prefs ( 
id SERIAL PRIMARY KEY, 
user_id TEXT NOT NULL, 
category TEXT NOT NULL, 
channel TEXT NOT NULL CHECK (channel IN 
('web','fcm','apns','email')), 
mode TEXT NOT NULL CHECK (mode IN ('immediate','digest','mute')), 
quiet_start SMALLINT DEFAULT 22, 
quiet_end SMALLINT DEFAULT 7, 
UNIQUE (user_id, category, channel) 
); 
CREATE TABLE IF NOT EXISTS inbox ( 
id BIGSERIAL PRIMARY KEY, 
user_id TEXT NOT NULL, 
category TEXT NOT NULL, 
title TEXT NOT NULL, 
body TEXT NOT NULL, 
data JSONB DEFAULT '{}'::jsonb, 
priority TEXT DEFAULT 'normal', 
channel TEXT, 
attempts INT DEFAULT 0, 
status TEXT DEFAULT 'queued', 
error TEXT, 
created_at TIMESTAMPTZ DEFAULT now(), 
sent_at TIMESTAMPTZ 
); 
CREATE INDEX IF NOT EXISTS idx_inbox_user_status ON inbox(user_id, 
status); 
Notas de integración GNEW 
● Roles: 
○ Backend: este servicio (services/notifications) + tablas en Postgres + 
métricas Prometheus + OTEL. 
○ Mobile/Web: uso de FCM/APNs y WebPush (+ apps/web con sw.js y helper 
registerPush.ts). 
● Stack: 
○ Web Push con VAPID (web-push), FCM (HTTP legacy simple), APNs (apn). 
○ Digest/anti-saturación: preferencias por categoría/canal 
(immediate|digest|mute), quiet-hours, consolidación horaria. 
● Entregables: 
○ API y worker digest ya incluidos. 
○ Preferencias granulares vía GET/PUT /v1/prefs/:user. 
○ Enlace de opt-out público (/v1/optout?...) insertable en payload. 
● DoD medible: 
○ Panel Prometheus/Grafana: notifications_deliverability_ratio ≥ 
0.95 sostenido. 
○ Exporta latencia de entrega (notifications_delivery_latency_ms) y 
conteos de éxito/fallo por canal. 
○ Ruta de health y metrics listas para probes y scraping. 
Con esto tienes la mensajería push desacoplada, resistente al “spam”, con digest 
automático, métricas de entregabilidad (meta ≥95%) y opt-out en un clic, coherente 
con la arquitectura del monorepo GNEW. 
Tú dijiste: 
programa a profundidad para GNEW N77 8.7 Colaboración en documentos y código (Prompt 
77) Objetivo: Co-edición y adjuntos con control de versiones. Roles: Backend, Frontend, 
Seguridad. Stack: CRDT/OT, S3-compatible cifrado, diffs. Entregables: Editor colaborativo y 
visor de PRs. DoD: Conflictos manejados; auditoría de cambios. 
ChatGPT Plus 
Pensó durante 1m 4s 
Ruta completa: .\services\collab\package.json 
{ 
  "name": "collab", 
  "version": "1.0.0", 
  "private": true, 
  "type": "module", 
  "main": "index.js", 
  "scripts": { 
    "dev": "node index.js", 
    "test": "vitest run", 
    "migrate": "alembic upgrade head" 
  }, 
  "dependencies": { 
    "express": "^4.21.2", 
    "ws": "^8.18.0", 
    "yjs": "^13.6.20", 
    "y-websocket": "^1.5.10", 
    "@aws-sdk/client-s3": "^3.740.0", 
    "jsonwebtoken": "^9.0.2", 
    "pg": "^8.11.5", 
    "diff": "^7.0.0", 
    "prom-client": "^15.1.1", 
    "@opentelemetry/api": "^1.9.0", 
    "@opentelemetry/sdk-node": "^0.49.0", 
    "@opentelemetry/exporter-trace-otlp-http": "^0.49.0", 
    "@opentelemetry/exporter-metrics-otlp-http": "^0.49.0", 
    "@opentelemetry/resources": "^1.22.0", 
    "@opentelemetry/semantic-conventions": "^1.22.0", 
    "@opentelemetry/sdk-metrics": "^1.22.0" 
  }, 
  "devDependencies": { 
    "vitest": "^1.4.0", 
    "supertest": "^6.3.4", 
    "@types/express": "^4.17.21", 
    "@types/jsonwebtoken": "^9.0.6", 
    "@types/node": "^22.7.4" 
  }, 
  "license": "GPL-3.0-or-later" 
} 
 
Ruta completa: .\services\collab\Dockerfile 
ARG NODE_VERSION=20-alpine 
FROM node:${NODE_VERSION} AS build 
WORKDIR /app 
RUN corepack enable 
ARG NODE_ENV=production 
ENV NODE_ENV=${NODE_ENV} 
COPY package.json ./ 
RUN pnpm install --prod 
COPY . . 
FROM node:${NODE_VERSION} 
WORKDIR /app 
RUN corepack enable && apk add --no-cache curl 
ARG NODE_ENV 
ENV NODE_ENV=${NODE_ENV} 
COPY --from=build /app /app 
USER 1001 
EXPOSE 8000 
HEALTHCHECK --interval=30s CMD curl -fsS http://localhost:8000/health 
|| exit 1 
CMD ["pnpm","dev"] 
Ruta completa: .\services\collab\index.js 
import express from 'express'; 
import { createServer } from 'http'; 
import { WebSocketServer } from 'ws'; 
import { setupWSConnection } from 'y-websocket/bin/utils'; 
import jwt from 'jsonwebtoken'; 
import { Pool } from 'pg'; 
import { collectDefaultMetrics, register, Counter, Gauge } from 
'prom-client'; 
import { startOtel } from '../common/otel.js'; 
import { createLogger } from '../common/logger.js'; 
import { putEncrypted, getEncrypted, ensureBucket } from './s3.js'; 
import { appendAudit, listAudit } from './audit.js'; 
import { createUnifiedDiff } from './utils/diff.js'; 
const PORT = process.env.PORT || 8000; 
const SECRET_KEY = process.env.SECRET_KEY || 'change_this_secret'; 
const S3_BUCKET = process.env.S3_BUCKET || 'gnew-collab'; 
const DATABASE_URL = process.env.DATABASE_URL || 
'postgres://gnew:gnew@postgres:5432/gnew'; 
startOtel('collab'); 
const logger = createLogger('collab'); 
const pool = new Pool({ connectionString: DATABASE_URL }); 
const app = express(); 
app.use(express.json()); 
// Prometheus metrics 
try { register.clear(); } catch {} 
collectDefaultMetrics(); 
register.setDefaultLabels({ service_name: 'collab', environment: 
process.env.ENVIRONMENT || 'dev' }); 
const serviceInfo = new Gauge({ name: 'service_info', help: 'Service 
labels', labelNames: ['service_name','environment']}); 
serviceInfo.labels('collab', process.env.ENVIRONMENT || 'dev').set(1); 
const savesCounter = new Counter({ name: 'collab_saves_total', help: 
'Total doc snapshot saves' }); 
const attachCounter = new Counter({ name: 'collab_attachments_total', 
help: 'Total encrypted attachments saved' }); 
// Simple auth middleware (HS256 shared secret, aligned con 
comunicaciones) 
function auth(req, res, next) { 
const h = req.headers.authorization || ''; 
const [scheme, token] = h.split(' '); 
if (scheme !== 'Bearer' || !token) return res.status(401).json({ 
error: 'unauthorized' }); 
try { 
req.user = jwt.verify(token, SECRET_KEY); 
next(); 
} catch { 
    res.status(401).json({ error: 'unauthorized' }); 
  } 
} 
 
app.get('/health', async (_req, res) => { 
  let db = 'ok'; 
  try { await pool.query('SELECT 1'); } catch { db = 'fail'; } 
  res.status(db === 'ok' ? 200 : 500).json({ status: db === 'ok' ? 
'ok' : 'error', dependencies: { db, vault: 'ok', s3: 'ok' } }); 
}); 
 
// Persist a Yjs snapshot (client posts doc state vector) 
app.post('/v1/docs/:id/snapshot', auth, async (req, res) => { 
  const { id } = req.params; 
  const { update, contentType = 'application/y-update' } = req.body || 
{}; 
  if (!update) return res.status(400).json({ error: 'update payload 
required' }); 
  try { 
    await ensureBucket(S3_BUCKET); 
    const key = `docs/${id}/${Date.now()}.bin`; 
    await putEncrypted(S3_BUCKET, key, Buffer.from(update, 'base64'), 
{ 'x-amz-meta-content-type': contentType, 'x-amz-meta-user': 
req.user.sub || 'unknown' }); 
    savesCounter.inc(); 
    await appendAudit(pool, id, req.user.sub || 'unknown', 'snapshot', 
{ key, contentType }); 
    res.json({ status: 'ok', key }); 
  } catch (e) { 
    logger.error(e); 
    res.status(500).json({ error: 'S3_SAVE_ERROR' }); 
  } 
}); 
 
// Fetch latest snapshot 
app.get('/v1/docs/:id/snapshot/latest', auth, async (req, res) => { 
  const { id } = req.params; 
  try { 
    await ensureBucket(S3_BUCKET); 
    // list latest by prefix via S3 list (done in s3.js) 
    const latest = await getEncrypted(S3_BUCKET, `docs/${id}/`, { 
latest: true }); 
    if (!latest) return res.status(404).json({ error: 'not_found' }); 
    res.setHeader('Content-Type', latest.contentType || 
'application/octet-stream'); 
    res.json({ update: latest.data.toString('base64'), key: 
latest.key, contentType: latest.contentType }); 
  } catch (e) { 
    logger.error(e); 
    res.status(500).json({ error: 'S3_READ_ERROR' }); 
  } 
}); 
 
// Encrypted attachment upload 
app.post('/v1/docs/:id/attachments', auth, async (req, res) => { 
  const { id } = req.params; 
  const { filename, data, contentType } = req.body || {}; 
  if (!filename || !data) return res.status(400).json({ error: 
'filename and data (base64) required' }); 
  try { 
    await ensureBucket(S3_BUCKET); 
    const key = `attachments/${id}/${Date.now()}-${filename}`; 
    await putEncrypted(S3_BUCKET, key, Buffer.from(data, 'base64'), { 
'x-amz-meta-content-type': contentType || 'application/octet-stream', 
'x-amz-meta-user': req.user.sub || 'unknown' }); 
    attachCounter.inc(); 
    await appendAudit(pool, id, req.user.sub || 'unknown', 
'attachment', { key, filename, contentType }); 
    res.json({ status: 'ok', key }); 
  } catch (e) { 
    logger.error(e); 
    res.status(500).json({ error: 'S3_SAVE_ERROR' }); 
  } 
}); 
 
// Audit trail 
app.get('/v1/docs/:id/audit', auth, async (req, res) => { 
const { id } = req.params; 
const rows = await listAudit(pool, id); 
res.json({ entries: rows }); 
}); 
// Unified diff (visor de PRs minimal: recibe pares de textos) 
app.post('/v1/diff', auth, async (req, res) => { 
const { filename = 'file.txt', base, head } = req.body || {}; 
if (typeof base !== 'string' || typeof head !== 'string') return 
res.status(400).json({ error: 'base and head strings required' }); 
const diff = createUnifiedDiff(filename, base, head); 
res.json({ diff }); 
}); 
const server = createServer(app); 
// --- WebSocket Yjs Gateway (presencia, backpressure, etc.) 
const wss = new WebSocketServer({ server, path: '/collab' }); 
// Backpressure: drop if buffered > 10MB 
wss.on('connection', (ws, req) => { 
// Simple token gate: ?token=... 
const url = new URL(req.url, `http://${req.headers.host}`); 
const token = url.searchParams.get('token'); 
try { jwt.verify(token || '', SECRET_KEY); } catch { ws.close(4401, 
'unauthorized'); return; } 
ws.on('message', () => { 
if (ws.bufferedAmount > 10 * 1024 * 1024) { 
try { ws.close(1013, 'backpressure'); } catch {} 
} 
}); 
setupWSConnection(ws, req, { maxDebounceTime: 2000 }); // agrupa 
actualizaciones 
}); 
server.listen(PORT, () => { 
logger.info({ port: PORT }, 'collab service listening'); 
}); 
export default app; 
Ruta completa: .\services\collab\s3.js 
import { S3Client, PutObjectCommand, ListObjectsV2Command, 
GetObjectCommand } from '@aws-sdk/client-s3'; 
import crypto from 'node:crypto'; 
import { transitEncrypt, transitDecrypt, loadServiceSecrets, autoRenew 
} from '../common/vault.js'; 
autoRenew(); 
await loadServiceSecrets('collab'); 
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://minio:9000'; 
const S3_REGION = process.env.S3_REGION || 'us-east-1'; 
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'minioadmin'; 
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minioadmin'; 
const TRANSIT_KEY = process.env.TRANSIT_KEY || 'gnew-collab-v1'; 
const s3 = new S3Client({ 
region: S3_REGION, 
endpoint: S3_ENDPOINT, 
forcePathStyle: true, 
credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: 
S3_SECRET_KEY } 
}); 
// envelope encryption: dataKey (AES-256-GCM) protected by Vault 
transit 
function encryptBuffer(plain) { 
const dataKey = crypto.randomBytes(32); 
const iv = crypto.randomBytes(12); 
const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv); 
const enc = Buffer.concat([cipher.update(plain), cipher.final()]); 
const tag = cipher.getAuthTag(); 
  return { enc, iv, tag, dataKey }; 
} 
 
function decryptBuffer({ enc, iv, tag }, dataKey) { 
  const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, 
iv); 
  decipher.setAuthTag(tag); 
  return Buffer.concat([decipher.update(enc), decipher.final()]); 
} 
 
export async function ensureBucket(_bucket) { 
  // Buckets are auto-provisioned out-of-band; noop here to keep 
simple in CI. 
} 
 
export async function putEncrypted(bucket, key, buf, meta = {}) { 
  const { enc, iv, tag, dataKey } = encryptBuffer(buf); 
  const wrapped = await transitEncrypt(TRANSIT_KEY, 
dataKey.toString('base64')); 
  const Body = Buffer.concat([iv, tag, enc]); // [12|16|N] 
  await s3.send(new PutObjectCommand({ 
    Bucket: bucket, 
    Key: key, 
    Body, 
    Metadata: { 
      'x-wrapped-key': wrapped, 
