import React, { useEffect, useMemo, useState } from "react";
import {
  BrowserProvider,
  Contract,
  Eip1193Provider,
  ethers,
  type InterfaceAbi,
} from "ethers";
import DelegationAbi from "../abis/delegation";

type Props = Readonly<{
  contractAddress: string;
  scopeLabel?: string; // p.ej. "TOKEN_VOTES" | "REPUTATION_VOTES"
}>;

function toBytes32(label: string) {
  return ethers.id(label);
}

function formatExpiration(exp?: bigint) {
  if (exp === undefined) return "…";
  if (exp === 0n) return "sin expiración";
  return new Date(Number(exp) * 1000).toLocaleString();
}

function activeLabel(active?: boolean) {
  return active ? "(activo)" : "(—)";
}

export default function DelegationCard({
  contractAddress,
  scopeLabel = "TOKEN_VOTES",
}: Props) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState("");
  const [delegatee, setDelegatee] = useState("");
  const [expiresAt, setExpiresAt] = useState(""); // ISO datetime-local input value
  const [status, setStatus] = useState<{ effective: string; active: boolean; exp: bigint } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const scope = useMemo(() => toBytes32(scopeLabel), [scopeLabel]);

  useEffect(() => {
    const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
    if (!eth) return;
    const p = new BrowserProvider(eth);
    setProvider(p);
    (async () => {
      const [addr] = await eth.request!({ method: "eth_requestAccounts" });
      setAccount(addr);
    })();
  }, []);

  async function readStatus() {
    if (!provider) return;
    const c = new Contract(contractAddress, DelegationAbi as InterfaceAbi, await provider.getSigner());
    const [effective, active, exp] = await c.effectiveDelegateOf(account, scope);
    setStatus({ effective, active, exp });
  }

  useEffect(() => {
    if (provider && account) readStatus().catch(console.error);
  }, [provider, account, scope]);

  async function onDelegate() {
    if (!provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const c = new Contract(contractAddress, DelegationAbi as InterfaceAbi, signer);
      const expTs = expiresAt && expiresAt.length ? Math.floor(new Date(expiresAt).getTime() / 1000) : 0;
      const tx = await c.delegate(scope, delegatee, expTs);
      await tx.wait();
      setDelegatee("");
      setExpiresAt("");
      await readStatus();
    } finally {
      setLoading(false);
    }
  }

  async function onExtend(newIso?: string) {
    if (!provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const c = new Contract(contractAddress, DelegationAbi as InterfaceAbi, signer);
      const expTs = newIso && newIso.length ? Math.floor(new Date(newIso).getTime() / 1000) : 0;
      const tx = await c.extend(scope, expTs);
      await tx.wait();
      await readStatus();
    } finally {
      setLoading(false);
    }
  }

  async function onRevoke() {
    if (!provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const c = new Contract(contractAddress, DelegationAbi as InterfaceAbi, signer);
      const tx = await c.revoke(scope);
      await tx.wait();
      await readStatus();
    } finally {
      setLoading(false);
    }
  }

  const delegateEffective = status ? status.effective : "…";
  const activeText = activeLabel(status?.active);
  const expirationText = formatExpiration(status?.exp);
  const delegateButtonText = status?.active ? "Reasignar" : "Delegar";

  return (
    <div className="max-w-xl rounded-2xl p-4 shadow border">
      <h2 className="text-xl font-semibold mb-2">Delegación — {scopeLabel}</h2>
      <div className="text-sm mb-3">
        <div>
          <b>Cuenta:</b> {account || "—"}
        </div>
        <div>
          <b>Delegado efectivo:</b> {delegateEffective} {activeText}
        </div>
        <div>
          <b>Expira:</b> {expirationText}
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="delegatee" className="text-xs opacity-70">
          Delegado
        </label>
        <input
          id="delegatee"
          className="border rounded p-2"
          placeholder="0xDelegatee"
          value={delegatee}
          onChange={(e) => setDelegatee(e.target.value)}
        />
        <label htmlFor="expiration" className="text-xs opacity-70">
          Expiración (opcional)
        </label>
        <input
          id="expiration"
          type="datetime-local"
          className="border rounded p-2"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <div className="flex gap-2 mt-2">
          <button
            disabled={loading || !delegatee}
            onClick={onDelegate}
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {delegateButtonText}
          </button>
          <button
            disabled={loading || !status?.active}
            onClick={() => onExtend("")}
            className="px-3 py-2 rounded border"
            title="Quita la expiración (permanente hasta revocar)"
          >
            Quitar expiración
          </button>
          <button
            disabled={loading || !status?.active}
            onClick={onRevoke}
            className="px-3 py-2 rounded border"
          >
            Revocar
          </button>
        </div>
      </div>
    </div>
  );
}

