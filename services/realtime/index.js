import http from 'http'; 
import express from 'express'; 
import cors from 'cors'; 
import { WebSocketServer, WebSocket } from 'ws'; 
import { connectNats, publishWithTrace } from '../common/nats.js'; 
import { startOtel } from '../common/otel.js'; 
import { createLogger } from '../common/logger.js'; 
import { register, collectDefaultMetrics, Counter, Gauge, Histogram } 
from 'prom-client'; 
import { v4 as uuid } from 'uuid'; 
import url from 'url'; 
import { getPublicKeys, verify as verifyJwt } from 
'@repo/auth-client'; 
const SERVICE = 'realtime'; 
startOtel(SERVICE); 
const log = createLogger(SERVICE); 
const app = express(); 
app.use(cors()); 
app.use(express.json()); 
// --- Config --- 
const PORT = Number(process.env.PORT || 8010); 
const REGION = process.env.REALTIME_REGION || 'dev'; 
const MAX_QUEUE = Number(process.env.MAX_QUEUE || 200); 
const PING_INTERVAL = Number(process.env.PING_INTERVAL_MS || 15000); 
const PONG_TIMEOUT = Number(process.env.PONG_TIMEOUT_MS || 10000); 
const ALLOW_SSE = String(process.env.ALLOW_SSE || 'true') === 'true'; 
const SUBJECTS = { 
governance: process.env.ROOM_GOV_SUBJECT || 'gov.events', 
economy: process.env.ROOM_ECO_SUBJECT || 'economy.events' 
}; 
// --- Metrics --- 
collectDefaultMetrics(); 
const connectionsGauge = new Gauge({ name: 'rt_connections', help: 
'Active WS connections' }); 
const roomGauge = new Gauge({ name: 'rt_room_members', help: 'Members 
per room', labelNames: ['room'] }); 
const queueGauge = new Gauge({ name: 'rt_send_queue', help: 'Queued 
messages per client' }); 
const dropCounter = new Counter({ name: 'rt_dropped_messages_total', 
help: 'Messages dropped due to backpressure', labelNames: ['reason'] 
}); 
const broadcastLatency = new Histogram({ 
name: 'rt_broadcast_latency_seconds', 
help: 'End-to-end latency from NATS ingest to client send', 
buckets: [0.01, 0.03, 0.05, 0.1, 0.2, 0.3, 0.5, 1] 
}); 
// --- Health & Metrics --- 
app.get('/health', (_req, res) => res.json({ status: 'ok', region: 
REGION, subjects: SUBJECTS })); 
app.get('/metrics', async (_req, res) => { 
  res.set('Content-Type', register.contentType); 
  res.end(await register.metrics()); 
}); 
 
// --- SSE endpoint (opcional/fallback) --- 
const sseClients = new Map(); // key -> { res, rooms:Set, userId } 
function sseAuth(req) { 
  const auth = req.headers['authorization']; 
  if (!auth || !auth.startsWith('Bearer ')) return null; 
  return auth.slice(7); 
} 
if (ALLOW_SSE) { 
  app.get('/sse/:room', async (req, res) => { 
    try { 
      const token = sseAuth(req); 
      if (!token) return res.status(401).end(); 
      await getPublicKeys(); // cache warm-up 
      const payload = await verifyJwt(token); 
      const userId = String(payload.sub || 'anon'); 
      const room = req.params.room; 
 
      res.writeHead(200, { 
        'Content-Type': 'text/event-stream', 
        'Cache-Control': 'no-cache, no-transform', 
        Connection: 'keep-alive', 
        'X-Accel-Buffering': 'no' 
      }); 
      const id = uuid(); 
      sseClients.set(id, { res, rooms: new Set([room]), userId }); 
      res.write(`event: ready\ndata: ${JSON.stringify({ id, userId, 
room })}\n\n`); 
      addPresence(userId, room); 
 
      req.on('close', () => { 
        sseClients.delete(id); 
        removePresence(userId, room); 
      }); 
    } catch (e) { 
      log.error({ err: e }, 'SSE auth error'); 
      res.status(401).end(); 
    } 
  }); 
} 
 
// --- WebSocket Hub --- 
const server = http.createServer(app); 
const wss = new WebSocketServer({ noServer: true }); 
 
/** presence state */ 
const presence = { 
  rooms: new Map() // room -> Map(userId, { ts, region }) 
}; 
function addPresence(userId, room) { 
  const m = presence.rooms.get(room) || new Map(); 
  m.set(userId, { ts: Date.now(), region: REGION }); 
  presence.rooms.set(room, m); 
  broadcastPresence(room); 
} 
function removePresence(userId, room) { 
  const m = presence.rooms.get(room); 
  if (!m) return; 
  m.delete(userId); 
  if (m.size === 0) presence.rooms.delete(room); 
  broadcastPresence(room); 
} 
function broadcastPresence(room) { 
  const list = Array.from((presence.rooms.get(room) || new 
Map()).entries()).map(([id, v]) => ({ id, ...v })); 
  roomGauge.set({ room }, list.length); 
  const msg = JSON.stringify({ type: 'presence', room, members: list, 
ts: Date.now() }); 
  for (const c of clients.values()) { 
    if (c.rooms.has(room)) safeSend(c, msg); 
  } 
  for (const [, sse] of sseClients) { 
    if (sse.rooms.has(room)) sse.res.write(`event: presence\ndata: 
${msg}\n\n`); 
  } 
} 
 
const clients = new Map(); // id -> { ws, userId, rooms:Set, queue:[], 
lastPong:number } 
function safeSend(client, data) { 
  // backpressure: cola con shedding de más antiguos 
  if (client.ws.readyState !== WebSocket.OPEN) return; 
  if (client.queue.length > 0) { 
    if (client.queue.length >= MAX_QUEUE) { 
      client.queue.shift(); 
      dropCounter.inc({ reason: 'overflow' }); 
    } 
    client.queue.push(data); 
    queueGauge.set(client.queue.length); 
    return; 
  } 
  const ok = client.ws.send(data, { binary: false }, (err) => { 
    if (err) { 
      // si falla, encolar y reintentar 
      client.queue.push(data); 
      queueGauge.set(client.queue.length); 
      dropCounter.inc({ reason: 'send_error' }); 
    } 
  }); 
  if (ok === false) { 
    client.queue.push(data); 
    queueGauge.set(client.queue.length); 
  } 
} 
 
// flush loop 
setInterval(() => { 
  for (const c of clients.values()) { 
    if (c.ws.readyState !== WebSocket.OPEN) continue; 
    while (c.queue.length > 0) { 
      const data = c.queue.shift(); 
      try { 
        c.ws.send(data); 
      } catch { 
        c.queue.unshift(data); 
        break; 
      } 
    } 
    queueGauge.set(c.queue.length); 
  } 
}, 20); 
 
// heartbeat 
setInterval(() => { 
  const now = Date.now(); 
  for (const c of clients.values()) { 
    try { 
      c.ws.ping(); 
    } catch {} 
    if (now - c.lastPong > PING_INTERVAL + PONG_TIMEOUT) { 
      try { c.ws.terminate(); } catch {} 
    } 
  } 
}, PING_INTERVAL); 
 
// HTTP Upgrade -> WS 
server.on('upgrade', async (req, socket, head) => { 
  const { query } = url.parse(req.url, true); 
  const token = (req.headers['authorization'] && 
String(req.headers['authorization']).replace(/^Bearer\s+/i, '')) || 
                query?.token; 
  if (!token) { 
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); 
    socket.destroy(); 
    return; 
  } 
  try { 
    await getPublicKeys(); 
    const user = await verifyJwt(String(token)); 
    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, 
user)); 
  } catch (e) { 
    log.error({ err: e }, 'WS auth error'); 
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); 
    socket.destroy(); 
  } 
}); 
 
function onConnection(ws, user) { 
  const id = uuid(); 
  const client = { ws, id, userId: String(user.sub || 'anon'), rooms: 
new Set(), queue: [], lastPong: Date.now() }; 
  clients.set(id, client); 
  connectionsGauge.set(clients.size); 
 
  ws.on('pong', () => { client.lastPong = Date.now(); }); 
 
  ws.on('message', (buf) => { 
    try { 
      const msg = JSON.parse(buf.toString()); 
      if (msg.type === 'join' && msg.room) { 
        client.rooms.add(msg.room); 
        addPresence(client.userId, msg.room); 
        safeSend(client, JSON.stringify({ type: 'joined', room: 
msg.room })); 
      } else if (msg.type === 'leave' && msg.room) { 
        client.rooms.delete(msg.room); 
        removePresence(client.userId, msg.room); 
        safeSend(client, JSON.stringify({ type: 'left', room: msg.room 
})); 
      } 
    } catch (e) { 
      log.warn({ err: e }, 'invalid message'); 
    } 
  }); 
 
  ws.on('close', () => { 
    for (const room of client.rooms) removePresence(client.userId, 
room); 
    clients.delete(id); 
    connectionsGauge.set(clients.size); 
  }); 
 
  safeSend(client, JSON.stringify({ type: 'ready', id, region: REGION, 
ts: Date.now() })); 
} 
 
// --- NATS fanout --- 
const nc = await connectNats({ servers: process.env.NATS_URL || 
'nats://localhost:4222' }); 
const js = nc.jetstream(); 
 
async function subscribeSubject(subject, room) { 
  const sub = nc.subscribe(subject, { queue: `${SERVICE}-${REGION}` 
}); 
  (async () => { 
    for await (const m of sub) { 
      const now = Date.now(); 
      let payload; 
      try { 
        payload = JSON.parse(new TextDecoder().decode(m.data)); 
      } catch { 
        payload = { raw: Buffer.from(m.data).toString('base64') }; 
      } 
      const event = { type: 'event', room, subject, ts: now, data: 
payload }; 
      const data = JSON.stringify(event); 
 
      // WS clients 
      for (const c of clients.values()) { 
        if (c.rooms.has(room)) { 
          const start = process.hrtime.bigint(); 
          safeSend(c, data); 
          const end = process.hrtime.bigint(); 
          broadcastLatency.observe(Number(end - start) / 1e9); 
        } 
      } 
      // SSE clients 
      for (const [, sse] of sseClients) { 
        if (sse.rooms.has(room)) { 
          sse.res.write(`event: event\ndata: ${data}\n\n`); 
        } 
      } 
    } 
  })().catch((e) => log.error({ err: e }, 'NATS subscribe error')); 
} 
 
await subscribeSubject(SUBJECTS.governance, 'governance'); 
await subscribeSubject(SUBJECTS.economy, 'economy'); 
 
// --- Demo publish (opcional): curl -X POST /demo --- 
app.post('/demo', async (req, res) => { 
  const { room = 'governance', data = { hello: 'world' } } = req.body 
|| {}; 
  const subject = room === 'economy' ? SUBJECTS.economy : 
SUBJECTS.governance; 
  await publishWithTrace(js, subject, 
Buffer.from(JSON.stringify(data))); 
  res.json({ ok: true }); 
}); 
 
server.listen(PORT, () => { 
  log.info({ PORT, REGION }, 'realtime ready'); 
}); 
 
 
