import webpush from "web-push"; 
import apn from "apn"; 
/** 
* Inicializa proveedores desde variables/Vault: 
* - WEB_PUSH_PUBLIC/PRIVATE (VAPID) 
* - FCM_SERVER_KEY (legacy) o FCM_BEARER (v1) 
* - APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, 
APNS_PRODUCTION 
*/ 
export async function initPushProviders() { 
  const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY; 
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY; 
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 
"mailto:ops@gnew.local"; 
  if (VAPID_PUBLIC && VAPID_PRIVATE) { 
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, 
VAPID_PRIVATE); 
  } 
} 
 
export async function sendWebPush(sub, payload) { 
  const msg = JSON.stringify({ 
    title: payload.title, 
    body: payload.body, 
    data: payload.data || {}, 
    category: payload.category, 
    priority: payload.priority || "normal", 
    optout: makeOptoutLink(sub.user_id || "") // opcional si lo anexas 
desde el servicio 
  }); 
 
  const pushSub = { 
    endpoint: sub.endpoint, 
    keys: { p256dh: sub.p256dh, auth: sub.auth } 
  }; 
  await webpush.sendNotification(pushSub, msg); 
} 
 
// Implementación FCM (HTTP v1 si hay token de servicio, fallback 
legacy server key) 
export async function sendFcm(sub, payload) { 
  const legacyKey = process.env.FCM_SERVER_KEY; 
  const url = "https://fcm.googleapis.com/fcm/send"; 
  const body = { 
    to: sub.token, 
    notification: { 
      title: payload.title, 
      body: payload.body 
    }, 
    data: payload.data || {}, 
    android: { priority: payload.priority === "high" ? "high" : 
"normal" } 
  }; 
  const res = await fetch(url, { 
    method: "POST", 
    headers: { 
      "Authorization": `key=${legacyKey}`, 
      "Content-Type": "application/json" 
    }, 
    body: JSON.stringify(body) 
  }); 
  if (!res.ok) { 
    const t = await res.text(); 
    const err = new Error(`FCM ${res.status}: ${t}`); 
    err.code = `fcm_${res.status}`; 
    throw err; 
  } 
} 
 
let apnProvider = null; 
function getApn() { 
  if (apnProvider) return apnProvider; 
  const key = process.env.APNS_KEY; 
  const keyId = process.env.APNS_KEY_ID; 
  const teamId = process.env.APNS_TEAM_ID; 
  const prod = /^true$/i.test(process.env.APNS_PRODUCTION || "false"); 
  if (!key || !keyId || !teamId) return null; 
  apnProvider = new apn.Provider({ 
    token: { key, keyId, teamId }, 
    production: prod 
  }); 
  return apnProvider; 
} 
 
export async function sendApns(sub, payload) { 
  const provider = getApn(); 
  if (!provider) { 
    const e = new Error("APNs not configured"); 
    e.code = "apns_config"; 
    throw e; 
  } 
  const note = new apn.Notification(); 
  note.alert = { title: payload.title, body: payload.body }; 
  note.payload = payload.data || {}; 
  note.pushType = "alert"; 
  note.topic = process.env.APNS_BUNDLE_ID || "app.gnew.mobile"; 
  note.priority = payload.priority === "high" ? 10 : 5; 
  const result = await provider.send(note, sub.token); 
  const failure = result.failed?.[0]; 
  if (failure) { 
    const err = new Error(`APNs failed: ${failure.response?.reason || 
failure.error?.toString()}`); 
    err.code = "apns_failed"; 
    throw err; 
  } 
} 
 
// util opcional para enlaces de opt-out firmados por backend 
export function makeOptoutLink(userId) { 
  try { 
    const jwt = (await import("jsonwebtoken")).default; 
    const sig = jwt.sign({ sub: userId }, process.env.SECRET_KEY || 
"change_this_secret", { expiresIn: "7d" }); 
    return 
`/v1/optout?u=${encodeURIComponent(userId)}&sig=${encodeURIComponent(s
 ig)}&category=all`; 
  } catch { 
    return "/v1/optout"; 
  } 
} 
 
 
