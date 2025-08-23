// Registro de Service Worker + suscripción WebPush (VAPID) 
export async function registerWebPush(userId: string, 
notificationsBase = "/api/notifications") { 
if (!("serviceWorker" in navigator) || !("PushManager" in window)) 
return { ok: false, reason: "unsupported" }; 
const reg = await navigator.serviceWorker.register("/sw.js"); 
const vapid = (await fetch(`${notificationsBase}/v1/vapid`)).ok 
? await (await fetch(`${notificationsBase}/v1/vapid`)).json() 
: { publicKey: (window as any).__VAPID__ }; 
const sub = await reg.pushManager.subscribe({ 
    userVisibleOnly: true, 
    applicationServerKey: urlBase64ToUint8Array(vapid.publicKey) 
  }); 
  const deviceId = crypto.randomUUID(); 
  await fetch(`${notificationsBase}/v1/subscribe`, { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify({ 
      user_id: userId, 
      device_id: deviceId, 
      kind: "web", 
      subscription: sub.toJSON() 
    }) 
  }); 
  return { ok: true }; 
} 
 
function urlBase64ToUint8Array(base64String: string) { 
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4); 
  const base64 = (base64String + padding).replace(/-/g, 
"+").replace(/_/g, "/"); 
  const rawData = atob(base64); 
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))); 
} 
 
 
