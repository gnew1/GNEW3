
import http from "node:http";
import { cfg } from "./config.js";

export async function notify(event: string, payload: unknown) {
  if (!cfg.webhookUrl) return;
  try {
    const u = new URL(cfg.webhookUrl);
    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        { method: "POST", hostname: u.hostname, path: u.pathname, port: u.port || 80, headers: { "Content-Type": "application/json" } },
        (res) => { res.resume(); res.on("end", resolve); }
      );
      req.on("error", reject);
      req.write(JSON.stringify({ event, payload }));
      req.end();
    });
  } catch { /* ignore */ }
}


