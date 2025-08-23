self.addEventListener("push", (e) => { 
  const data = e.data?.json?.() || {}; 
  const title = data.title || "GNEW"; 
  const body = data.body || ""; 
  const optout = data.optout || "/api/notifications/v1/optout"; 
  const clickUrl = (data.data && data.data.url) || "/"; 
  e.waitUntil( 
    self.registration.showNotification(title, { 
      body, 
      data: { url: clickUrl, optout }, 
badge: "/icon-badge.png", 
icon: "/icon.png" 
}) 
); 
}); 
self.addEventListener("notificationclick", (e) => { 
e.notification.close(); 
const url = e.notification.data?.url || "/"; 
e.waitUntil(clients.openWindow(url)); 
}); 
