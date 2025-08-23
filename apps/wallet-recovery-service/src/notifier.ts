
type Contact = { email?: string; phone?: string; webhook?: string };
import { cfg } from "./config.js";
import http from "node:http";

export async function notify(contact: Contact, subject: string, body: string) {
  // Minimal: prefer webhook, fallback to email/phone (stubs).
  if (contact.webhook && cfg.notify.webhookUrl) {
    await postWebhook(contact.webhook, { subject, body });
  }
  if (contact.email && cfg.notify.smtpUrl) {
    // pragma: stub — integrate nodemailer in real deployment
    console.log(`[MAIL:${contact.email}] ${subject}\n${body}`);
  }
  if (contact.phone && cfg.notify.twilio.sid) {
    // pragma: stub — integrate Twilio SDK in real deployment
    console.log(`[SMS:${contact.phone}] ${subject}\n${body}`);
  }
}

async function postWebhook(url: string, data: unknown) {
  try {
    const u = new URL(url);
    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        { method: "POST", hostname: u.hostname, path: u.pathname, port: u.port || 80, headers: { "Content-Type": "application/json" } },
        (res) => { res.resume(); res.on("end", resolve); }
      );
      req.on("error", reject);
      req.write(JSON.stringify(data)); req.end();
    });
  } catch (e) {
    console.warn("Webhook error", e);
  }
}


