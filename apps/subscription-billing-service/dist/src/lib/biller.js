import { ethers } from "ethers";
import fetch from "node-fetch";
import { backOff } from "./retry";
// --- ENV ---
const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 31337);
const CONTRACT_ADDR = process.env.SUBSCRIPTION_ADDRESS;
const PRIVATE_KEY = process.env.WORKER_PRIVATE_KEY;
const PAYMASTER_URL = process.env.PAYMASTER_URL; // opcional (e.g., https://api.pimlico.io/v2/{chain}/rpc?apikey=...)
const MAX_FAIL_RATE = Number(process.env.MAX_FAIL_RATE ?? 0.01);
const BATCH_LIMIT = Number(process.env.BATCH_LIMIT ?? 20);
const MAX_SECONDS_PER_CHARGE = Number(process.env.MAX_SECONDS_PER_CHARGE ?? 3600 * 24 * 31);
// --- ABI (minimal) ---
const ABI = [
    "function subCount() view returns (uint256)",
    "function subs(uint256) view returns (uint256 planId,address user,uint64 startAt,uint64 lastChargedAt,uint64 cancelAt,uint128 debtOwed,bool active)",
    "function plans(uint256) view returns (address merchant,address token,uint96 ratePerSecond,uint32 minPeriod,bool active)",
    "function charge(uint256 subId) returns (uint256 amount)",
    "function computeOwed(uint256 subId) view returns (uint256 amount,uint64 fromTs,uint64 toTs)"
];
const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
const wallet = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, provider) : undefined;
const contract = new ethers.Contract(CONTRACT_ADDR, ABI, wallet ?? provider);
// --- State ---
let totals = { attempts: 0, success: 0, failed: 0, lastError: "" };
export function metrics() {
    return {
        ...totals,
        failRate: totals.attempts ? totals.failed / totals.attempts : 0
    };
}
// Enumerar subs y filtrar "due" por ventana corta (~ahora - lastChargedAt > 60s)
async function listDueSubs() {
    const count = await contract.subCount();
    const now = Math.floor(Date.now() / 1000);
    const due = [];
    for (let i = 1n; i <= count && due.length < BigInt(BATCH_LIMIT); i++) {
        const s = await contract.subs(i);
        const last = Number(s[3]); // lastChargedAt
        const cancelAt = Number(s[4]);
        const active = s[6];
        const cap = cancelAt > 0 ? Math.min(cancelAt, now) : now;
        if (cap <= last)
            continue;
        // no insistir si el plan está inactivo
        const planId = Number(s[0]);
        const p = await contract.plans(planId);
        if (!p[4])
            continue; // plan inactive
        due.push(i);
    }
    return due;
}
async function sendWithAA(to, data) {
    // Minimal sponsor example: generic endpoint following ERC-4337 RPC
    // Fallback: direct EOA tx
    if (!PAYMASTER_URL || !wallet) {
        const tx = await wallet.sendTransaction({ to, data, gasLimit: 1500000n });
        const rec = await tx.wait();
        return rec.hash;
    }
    const userOp = {
        sender: await wallet.getAddress(),
        nonce: (await provider.getTransactionCount(await wallet.getAddress())).toString(),
        initCode: "0x",
        callData: "0x",
        callGasLimit: "0x0",
        verificationGasLimit: "0x0",
        preVerificationGas: "0x0",
        maxFeePerGas: "0x" + (await provider.getFeeData()).maxFeePerGas.toString(16),
        maxPriorityFeePerGas: "0x" + (await provider.getFeeData()).maxPriorityFeePerGas.toString(16),
        paymasterAndData: "0x",
        signature: "0x"
    };
    // Here we encapsulate a single call to `charge(subId)` via AA smart wallet.
    // In real setup we'd encode a batch or use a Smart Account. For pilot, fallback to EOA if AA not configured.
    // Because AA setup varies widely, we keep this stub for sponsor compatibility and return fallback if sponsor not available.
    return sendWithEOA(to, data);
}
async function sendWithEOA(to, data) {
    const tx = await wallet.sendTransaction({ to, data, gasLimit: 1500000n });
    const rec = await tx.wait();
    return rec.hash;
}
export async function forceCharge(subId) {
    const calldata = contract.interface.encodeFunctionData("charge", [subId]);
    totals.attempts++;
    try {
        const hash = await backOff(async () => await sendWithAA(CONTRACT_ADDR, calldata), { retries: 4 });
        totals.success++;
        return { ok: true, txHash: hash, subId: subId.toString() };
    }
    catch (e) {
        totals.failed++;
        totals.lastError = e?.message ?? String(e);
        return { ok: false, error: totals.lastError };
    }
}
export async function chargeDueBatch() {
    const due = await listDueSubs();
    for (const id of due) {
        const owed = await contract.computeOwed(id);
        // evitar llamadas inútiles
        if (owed[0] === 0n)
            continue;
        const res = await forceCharge(id);
        if (!res.ok && metrics().failRate > MAX_FAIL_RATE) {
            // alerta básica (stdout / webhook opcional)
            if (process.env.ALERT_WEBHOOK) {
                try {
                    await fetch(process.env.ALERT_WEBHOOK, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: "alert", message: "High fail rate in subscription billing", metrics: metrics() })
                    });
                }
                catch {
                    // ignore
                }
            }
            break; // romper lote si estamos fallando demasiado
        }
    }
}
