import express from "express"; 
import { createServer } from "http"; 
import { Pool } from "pg"; 
import jwt from "jsonwebtoken"; 
import cron from "node-cron"; 
import webpush from "web-push"; 
import apn from "apn"; 
import { Counter, Gauge, Histogram, collectDefaultMetrics, register } 
from "prom-client"; 
import { startOtel } from "../common/otel.js"; 
import { createLogger } from "../common/logger.js"; 
import { readSecret, loadServiceSecrets, auto_renew as _ignored } from 
"../common/vault.js"; // Python version not usable here; use JS 
helpers instead: 
import { loadServiceSecrets as loadSecretsJS, autoRenew } from 
"../common/vault.js"; 
import { sendWebPush, sendFcm, sendApns, initPushProviders } from 
"./push.js"; 
await autoRenew(); 
await loadSecretsJS("notifications"); // carga VAPID/APNs/FCM de Vault 
cuando existan 
startOtel("notifications"); 
const logger = createLogger("notifications"); 
// --- Config --- 
const PORT = process.env.PORT || 8000; 
const SECRET_KEY = process.env.SECRET_KEY || "change_this_secret"; 
const DATABASE_URL = process.env.DATABASE_URL || 
"postgres://gnew:gnew@postgres:5432/gnew"; 
// --- Metrics --- 
try { register.clear(); } catch {} 
collectDefaultMetrics(); 
register.setDefaultLabels({ service_name: "notifications", 
environment: process.env.ENVIRONMENT || "dev" }); 
const sentCounter = new Counter({ name: "notifications_sent_total", 
help: "Notificaciones enviadas (exitosas)", labelNames: 
["channel","category"] }); 
const failCounter = new Counter({ name: "notifications_failed_total", 
help: "Notificaciones fallidas", labelNames: ["channel","reason"] }); 
const attemptCounter = new Counter({ name: 
"notifications_attempts_total", help: "Intentos de envío", labelNames: 
["channel"] }); 
const deliverabilityGauge = new Gauge({ name: 
"notifications_deliverability_ratio", help: "deliverability = sent / 
attempts" }); 
const p95Latency = new Histogram({ name: 
"notifications_delivery_latency_ms", help: "Latencia envío push (ms)", 
buckets: [50,100,150,200,300,500,1000,2000] }); 
const serviceInfo = new Gauge({ name: "service_info", help: "Service 
labels", labelNames: ["service_name","environment"] }); 
serviceInfo.labels("notifications", process.env.ENVIRONMENT || 
"dev").set(1); 
// --- DB --- 
const pool = new Pool({ connectionString: DATABASE_URL }); 
await pool.query(` 
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
  quiet_start SMALLINT DEFAULT 22, -- 22:00 local 
  quiet_end SMALLINT DEFAULT 7,    -- 07:00 local 
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
  channel TEXT,          -- canal elegido al enviar 
  attempts INT DEFAULT 0, 
  status TEXT DEFAULT 'queued', -- queued|sent|failed|suppressed 
  error TEXT, 
  created_at TIMESTAMPTZ DEFAULT now(), 
  sent_at TIMESTAMPTZ 
); 
CREATE INDEX IF NOT EXISTS idx_inbox_user_status ON inbox(user_id, 
status); 
CREATE INDEX IF NOT EXISTS idx_inbox_created ON inbox(created_at); 
`); 
 
// --- Init providers (VAPID/APNs/FCM) --- 
await initPushProviders(); 
 
// --- Helpers --- 
function verify(req) { 
  const auth = req.headers.authorization || ""; 
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null; 
  if (!token) return null; 
  try { 
    return jwt.verify(token, SECRET_KEY); 
  } catch { 
    return null; 
  } 
} 
 
function withinQuietHours(pref, now = new Date()) { 
  const h = now.getHours(); 
  const { quiet_start: qs = 22, quiet_end: qe = 7 } = pref || {}; 
  return qs > qe ? (h >= qs || h < qe) : (h >= qs && h < qe); 
} 
 
async function getPrefs(user_id) { 
  const { rows } = await pool.query(`SELECT * FROM notification_prefs 
WHERE user_id=$1`, [user_id]); 
  // por defecto: digest para todo salvo prioridad "high" -> immediate 
(en runtime) 
  const prefMap = {}; 
  for (const r of rows) { 
    prefMap[`${r.category}:${r.channel}`] = r; 
  } 
  return prefMap; 
} 
 
async function chooseChannel(user_id) { 
  // orden simple: web > fcm > apns (personalizable por usuario en el 
futuro) 
  const { rows } = await pool.query( 
    `SELECT kind, endpoint, token, p256dh, auth FROM 
push_subscriptions WHERE user_id=$1 ORDER BY last_seen DESC`, 
    [user_id] 
  ); 
  if (!rows.length) return null; 
  return rows[0]; // la más reciente 
} 
 
async function enqueue(user_id, category, title, body, data, 
priority="normal") { 
  const res = await pool.query( 
    `INSERT INTO inbox(user_id, category, title, body, data, priority) 
VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, 
    [user_id, category, title, body, data || {}, priority] 
  ); 
  return res.rows[0].id; 
} 
 
async function deliver(item, pref) { 
  const start = Date.now(); 
  let channelUsed = null; 
  try { 
    const sub = await chooseChannel(item.user_id); 
    if (!sub) { 
      failCounter.inc({ channel: "none", reason: "no_subscription" }); 
      await pool.query(`UPDATE inbox SET status='failed', 
error='no_subscription', attempts=attempts+1 WHERE id=$1`, [item.id]); 
      return; 
    } 
    const payload = { 
      title: item.title, 
      body: item.body, 
      data: item.data || {}, 
      category: item.category, 
      priority: item.priority 
    }; 
    attemptCounter.inc({ channel: sub.kind }); 
 
    if (sub.kind === "web") { 
      channelUsed = "web"; 
      await sendWebPush(sub, payload); 
    } else if (sub.kind === "fcm") { 
      channelUsed = "fcm"; 
      await sendFcm(sub, payload); 
    } else { 
      channelUsed = "apns"; 
      await sendApns(sub, payload); 
    } 
 
    const latency = Date.now() - start; 
    p95Latency.observe(latency); 
    sentCounter.inc({ channel: channelUsed, category: item.category 
}); 
    await pool.query(`UPDATE inbox SET status='sent', channel=$2, 
sent_at=now(), attempts=attempts+1 WHERE id=$1`, [item.id, 
channelUsed]); 
  } catch (err) { 
    failCounter.inc({ channel: channelUsed || "unknown", reason: (err 
&& err.code) || "error" }); 
    await pool.query(`UPDATE inbox SET status='failed', error=$2, 
attempts=attempts+1 WHERE id=$1`, [item.id, String(err)]); 
  } finally { 
    const { rows: a } = await pool.query(`SELECT  
      (SELECT COALESCE(SUM(attempts),0) FROM inbox) as attempts, 
      (SELECT COUNT(*) FROM inbox WHERE status='sent') as sent 
    `); 
    const attempts = Number(a[0].attempts || 0); 
    const sent = Number(a[0].sent || 0); 
    if (attempts > 0) deliverabilityGauge.set(sent / attempts); 
  } 
} 
 
async function processQueue() { 
  const { rows } = await pool.query(`SELECT * FROM inbox WHERE 
status='queued' ORDER BY created_at ASC LIMIT 50`); 
  for (const item of rows) { 
    const prefMap = await getPrefs(item.user_id); 
    // preferencia por categoría y canal “web” (default viewport) 
    const pref = prefMap[`${item.category}:web`] || 
prefMap[`${item.category}:fcm`] || prefMap[`${item.category}:apns`]; 
 
    const highPriority = item.priority === "high"; 
    const mode = pref?.mode || (highPriority ? "immediate" : 
"digest"); 
 
    // suprimir si MUTE o quiet hours (salvo prioridad alta) 
    if (mode === "mute") { 
      await pool.query(`UPDATE inbox SET status='suppressed' WHERE 
id=$1`, [item.id]); 
      continue; 
    } 
    if (!highPriority && withinQuietHours(pref)) { 
      // dejar en cola para digest nocturno / matutino 
      continue; 
    } 
    await deliver(item, pref); 
  } 
} 
 
// worker corto de “background” 
setInterval(processQueue, 1500); 
 
// digest cada hora a :05 (consolidado por usuario) 
cron.schedule("5 * * * *", async () => { 
  const { rows: users } = await pool.query(`SELECT DISTINCT user_id 
FROM inbox WHERE status='queued'`); 
  for (const u of users) { 
    const { rows: pending } = await pool.query( 
      `SELECT * FROM inbox WHERE user_id=$1 AND status='queued' ORDER 
BY created_at ASC`, 
      [u.user_id] 
    ); 
    if (!pending.length) continue; 
 
    // agrupar en un único mensaje TL;DR 
    const top = pending.slice(0, 5).map(x => `• 
${x.title}`).join("\n"); 
    const countExtra = Math.max(0, pending.length - 5); 
    const title = "Resumen (digest)"; 
    const body = countExtra ? `${top}\n…y ${countExtra} más` : top; 
 
    // crear item sintético de alta prioridad y marcar los demás como 
“suppressed” para digest 
    const id = await enqueue(u.user_id, "digest", title, body, { 
items: pending.map(x => x.id) }, "high"); 
    await pool.query(`UPDATE inbox SET status='suppressed' WHERE 
user_id=$1 AND status='queued'`, [u.user_id]); 
 
    const { rows: [created] } = await pool.query(`SELECT * FROM inbox 
WHERE id=$1`, [id]); 
    await deliver(created, null); 
  } 
}); 
 
// --- API --- 
const app = express(); 
app.use(express.json()); 
 
app.get("/v1/health", async (_req, res) => { 
  try { 
    await pool.query("SELECT 1"); 
    res.json({ status: "ok" }); 
  } catch { 
    res.status(500).json({ status: "error" }); 
  } 
}); 
 
app.get("/metrics", async (_req, res) => { 
  res.set("Content-Type", register.contentType); 
  res.end(await register.metrics()); 
}); 
 
/** 
 * Registrar suscripción WebPush / FCM / APNs 
 * body: { user_id, device_id, kind: 'web'|'fcm'|'apns', subscription? 
, token? } 
 */ 
app.post("/v1/subscribe", async (req, res) => { 
  const payload = verify(req); 
  const { user_id, device_id, kind, subscription, token } = req.body 
|| {}; 
  if (!user_id || !device_id || !kind) return res.status(400).json({ 
error: "missing fields" }); 
  if (payload && payload.sub && payload.sub !== user_id) return 
res.status(403).json({ error: "forbidden" }); 
 
  const fields = { 
    endpoint: subscription?.endpoint || null, 
    p256dh: subscription?.keys?.p256dh || null, 
    auth: subscription?.keys?.auth || null, 
    token: token || null 
  }; 
 
  await pool.query( 
    `INSERT INTO push_subscriptions(user_id, device_id, kind, 
endpoint, p256dh, auth, token, last_seen) 
     VALUES ($1,$2,$3,$4,$5,$6,$7,now()) 
     ON CONFLICT (device_id, kind) DO UPDATE SET 
endpoint=EXCLUDED.endpoint, p256dh=EXCLUDED.p256dh, 
auth=EXCLUDED.auth, token=EXCLUDED.token, last_seen=now()`, 
    [user_id, device_id, kind, fields.endpoint, fields.p256dh, 
fields.auth, fields.token] 
  ); 
  res.json({ status: "ok" }); 
}); 
 
/** 
 * Preferencias granulares 
 * PUT /v1/prefs/:user_id body: [{category, channel, mode, 
quiet_start?, quiet_end?}] 
 */ 
app.get("/v1/prefs/:user", async (req, res) => { 
  const { user } = req.params; 
  const { rows } = await pool.query(`SELECT category, channel, mode, 
quiet_start, quiet_end FROM notification_prefs WHERE user_id=$1`, 
[user]); 
  res.json({ user, prefs: rows }); 
}); 
 
app.put("/v1/prefs/:user", async (req, res) => { 
  const payload = verify(req); 
  const { user } = req.params; 
  if (payload && payload.sub !== user && payload.role !== "admin") 
return res.status(403).json({ error: "forbidden" }); 
 
  const prefs = Array.isArray(req.body) ? req.body : []; 
  const client = await pool.connect(); 
  try { 
    await client.query("BEGIN"); 
    for (const p of prefs) { 
      if (!p.category || !p.channel || !p.mode) continue; 
      await client.query( 
        `INSERT INTO notification_prefs(user_id, category, channel, 
mode, quiet_start, quiet_end) 
         VALUES ($1,$2,$3,$4,$5,$6) 
         ON CONFLICT (user_id, category, channel) DO UPDATE SET 
mode=EXCLUDED.mode, quiet_start=EXCLUDED.quiet_start, 
quiet_end=EXCLUDED.quiet_end`, 
        [user, p.category, p.channel, p.mode, p.quiet_start ?? 22, 
p.quiet_end ?? 7] 
      ); 
    } 
    await client.query("COMMIT"); 
    res.json({ status: "ok" }); 
  } catch (e) { 
    await client.query("ROLLBACK"); 
    res.status(500).json({ error: String(e) }); 
  } finally { 
    client.release(); 
  } 
}); 
 
/** 
 * Opt-out fácil (enlace público en correos / webpush) 
 * GET /v1/optout?u=<user>&sig=<signature>&category=<opt_category|all> 
 */ 
app.get("/v1/optout", async (req, res) => { 
  const { u, sig, category="all" } = req.query; 
  if (!u || !sig) return res.status(400).send("Bad Request"); 
  const valid = (() => { 
    try { 
      const dec = jwt.verify(sig, SECRET_KEY); 
      return dec.sub === u; 
    } catch { return false; } 
  })(); 
  if (!valid) return res.status(403).send("Forbidden"); 
 
  if (category === "all") { 
    await pool.query(` 
      INSERT INTO notification_prefs(user_id, category, channel, mode) 
      VALUES ($1, '*', 'web', 'mute') 
      ON CONFLICT (user_id, category, channel) DO UPDATE SET 
mode='mute'`, [u]); 
  } else { 
    await pool.query(` 
      INSERT INTO notification_prefs(user_id, category, channel, mode) 
      VALUES ($1, $2, 'web', 'mute') 
      ON CONFLICT (user_id, category, channel) DO UPDATE SET 
mode='mute'`, [u, category]); 
  } 
res.type("html").send(`<html><body><h3>Preferencias 
actualizadas</h3><p>Se desactivaron notificaciones ${category === 
"all" ? "completas" : "de " + category}.</p></body></html>`); 
}); 
/** 
* Endpoint interno para encolar eventos (gobernanza/economía en vivo 
pueden decidir encolar) 
* body: { user_id, category, title, body, data?, priority? } 
*/ 
app.post("/v1/notify", async (req, res) => { 
const { user_id, category, title, body, data, priority } = req.body 
|| {}; 
if (!user_id || !category || !title || !body) return 
res.status(400).json({ error: "missing fields" }); 
const id = await enqueue(user_id, category, title, body, data, 
priority); 
res.json({ id, status: "queued" }); 
}); 
const server = createServer(app); 
server.listen(PORT, () => { 
logger.info({ port: PORT }, "notifications service listening"); 
}); 
