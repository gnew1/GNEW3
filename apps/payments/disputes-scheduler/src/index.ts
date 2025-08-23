
#!/usr/bin/env node
import fetch from "node-fetch";

const API_BASE = process.env.API_BASE ?? "http://localhost:8085";

async function list(status: string) {
  const r = await fetch(`${API_BASE}/disputes?status=${status}`);
  const j = await r.json();
  return j.disputes as any[];
}

async function autoClose(d: any) {
  const now = Date.now();
  if (d.respondBy > now) return;
  // reglas de autocierre
  const losingStates = ["chargeback","prearbitration","arbitration"];
  const next = losingStates.includes(d.status) ? "lost" : (d.status === "representment" ? "lost" : null);
  if (!next) return;
  await fetch(`${API_BASE}/disputes/${d.id}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ result: next })
  });
  console.log(`[scheduler] auto-closed ${d.id} → ${next}`);
}

async function tick() {
  try {
    const sts = ["chargeback","representment","prearbitration","arbitration"];
    for (const s of sts) {
      const rows = await list(s);
      for (const d of rows) await autoClose(d);
    }
  } catch (e) {
    console.error("[scheduler] error", e);
  }
}

async function main() {
  console.log("[scheduler] disputes loop started");
  // simple loop; usar cron/timers en prod
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await tick();
    await new Promise((r) => setTimeout(r, 30_000));
  }
}

main();

Notas de integración

Monedas en minor units (coherente con @gnew/marketplace-fees).

Ajustes (/adjustments/export) pensados para aplicarse en el ledger externo (balances/payouts).

Plazos y transiciones controlados por el scheduler.

Auditoría con hash encadenado en todas las operaciones clave.

Siguiente entrega (avanza +1): N159 – Fraud signals & risk scoring (si lo solicitas).

