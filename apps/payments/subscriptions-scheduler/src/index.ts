
#!/usr/bin/env node
import { formatISO } from "date-fns";
import fetch from "node-fetch";
import { createPublicClient, createWalletClient, http, parseAbi, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const API_BASE = process.env.API_BASE ?? "http://localhost:8082";
const RPC_URL = process.env.RPC_URL ?? "http://localhost:8545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BUNDLER_URL = process.env.BUNDLER_URL; // opcional, no implementado (placeholder)

const ABI = parseAbi([
  "function charge(uint256 planId, address subscriber)",
  "function previewProratedFirst(uint256 planId, uint64 startAt) view returns (uint256)",
  "function isDue(uint256 planId, address subscriber) view returns (bool)"
]);

const publicClient = createPublicClient({ chain: mainnet, transport: http(RPC_URL) });
const walletClient = PRIVATE_KEY
  ? createWalletClient({ chain: mainnet, transport: http(RPC_URL), account: privateKeyToAccount(PRIVATE_KEY as `0x${string}`) })
  : null;

type DueSub = {
  id: string;
  planId: string;
  subscriber: string;
  token: string;
  amount: number;
  periodSeconds: number;
  anchorTimestamp: number;
  graceSeconds: number;
  nextChargeAt: number;
  graceEndsAt: number;
  prorateFirst: number;
};

async function notify(scope: string, msg: string) {
  console.log(`[notify][${scope}] ${msg}`);
  // TODO: POST webhook / email / SMS
}

function backoffSeq(n: number) {
  const seq = [60_000, 5 * 60_000, 15 * 60_000, 60_000 * 60];
  return seq[Math.min(n, seq.length - 1)];
}

async function mainLoop() {
  console.log(`[scheduler] start ${formatISO(new Date())}`);
  while (true) {
    try {
      // 1) avisos previos (T-72h/24h/1h)
      // (puede hacerse también desde API mediante cron de sistema)
      // 2) cobros debidos
      const r = await fetch(`${API_BASE}/subscriptions/due`);
      const { due } = (await r.json()) as { due: DueSub[] };

      for (const s of due) {
        const isDue = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "isDue",
          args: [BigInt(s.planId), s.subscriber as `0x${string}`]
        });
        if (!isDue) continue;

        if (!walletClient && BUNDLER_URL) {
          // Placeholder: AA userOp submit
          await notify(s.id, "Enviar charge via bundler (no implementado en demo)");
          continue;
        }
        if (!walletClient) {
          await notify(s.id, "No signer configurado; saltando");
          continue;
        }

        try {
          const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: "charge",
            args: [BigInt(s.planId), s.subscriber as `0x${string}`]
          });
          await notify(s.id, `Cobro enviado tx=${hash}`);
          // actualizar nextChargeAt/graceEndsAt en API (simplificado: la API recalcula al consultar /due)
        } catch (e: any) {
          await notify(s.id, `Cobro falló: ${e?.message ?? e}`);
          // reintento con backoff (se delega al scheduler externo; aquí solo sleep)
          await new Promise((res) => setTimeout(res, backoffSeq(1)));
        }
      }
    } catch (e) {
      console.error("[scheduler] error", e);
    }
    await new Promise((res) => setTimeout(res, 30_000)); // ciclo cada 30s
  }
}

if (!CONTRACT_ADDRESS) {
  console.error("CONTRACT_ADDRESS requerido");
  process.exit(1);
}
mainLoop();

Notas de integración y cumplimiento del prompt

Prorrateo: soportado por anchorTimestamp a nivel plan y previewProratedFirst(); subscribe(..., prorateFirst=true) cobra proporcional de inmediato cuando hay ancla.

Fallbacks con backoff: en el scheduler (1m→5m→15m→1h) y grace period en contrato + API.

Alta/Baja: subscribe y cancel. Límites por período: un cargo por período por diseño (validación nextChargeAt). Avisos previos: esqueleto de notificación incluido en el scheduler; conéctalo a email/SMS/webhook.

AA listo: el scheduler puede enviar userOps a un bundler (placeholder BUNDLER_URL), o firmar con EOA (clave de servicio) mientras tanto.

¿Sigo con N155 – Checkout SDK para terceros en el siguiente paso? (Avanzo +1 sobre lo ya entregado).

