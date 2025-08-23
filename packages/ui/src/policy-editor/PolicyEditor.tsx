import React, { useEffect, useState } from "react";

type Props = {
  backend?: string; // http://localhost:8030
  activeVersion?: number;
};

export default function PolicyEditor({ backend = "http://localhost:8030", activeVersion }: Props) {
  const [model, setModel] = useState<string>("");
  const [policy, setPolicy] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    // cargar modelo/política de ejemplo desde repo, o permitir paste
    fetch("/policies/authz/model.conf").then(r=>r.text()).then(setModel).catch(()=>{});
    fetch("/policies/authz/policy.csv").then(r=>r.text()).then(setPolicy).catch(()=>{});
  }, []);

  async function validate() {
    try {
      const r = await fetch(`${backend}/authz/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sub: { id: "u1", role: "role_finance", tenant: "daoX", clearance: 4, department: "finance" },
          obj: "/api/ledger/tx/abc",
          act: "GET",
          ctx: { tenant: "daoX" }
        })
      });
      setMsg(`Decision: ${r.status} — ${await r.text()}`);
    } catch (e: any) {
      setMsg(`Error: ${String(e)}`);
    }
  }

  function exportBundle() {
    const blob = new Blob([JSON.stringify({ model, policy })], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "policy-bundle.json"; a.click();
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h2>Editor de Políticas (RBAC/ABAC)</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <h3>model.conf</h3>
          <textarea value={model} onChange={e=>setModel(e.target.value)} style={{ width: "100%", minHeight: 320, fontFamily: "monospace" }} />
        </div>
        <div>
          <h3>policy.csv</h3>
          <textarea value={policy} onChange={e=>setPolicy(e.target.value)} style={{ width: "100%", minHeight: 320, fontFamily: "monospace" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={validate}>Validar (ejemplo)</button>
        <button onClick={exportBundle}>Exportar bundle</button>
      </div>
      {msg && <pre style={{ background: "#f7f7f7", padding: 8, borderRadius: 6 }}>{msg}</pre>}
      {activeVersion && <small>Versión activa: {activeVersion}</small>}
    </div>
  );
}

