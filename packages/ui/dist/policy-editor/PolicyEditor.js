import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export default function PolicyEditor({ backend = "http://localhost:8030", activeVersion }) {
    const [model, setModel] = useState("");
    const [policy, setPolicy] = useState("");
    const [msg, setMsg] = useState("");
    useEffect(() => {
        // cargar modelo/política de ejemplo desde repo, o permitir paste
        fetch("/policies/authz/model.conf").then(r => r.text()).then(setModel).catch(() => { });
        fetch("/policies/authz/policy.csv").then(r => r.text()).then(setPolicy).catch(() => { });
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
        }
        catch (e) {
            setMsg(`Error: ${String(e)}`);
        }
    }
    function exportBundle() {
        const blob = new Blob([JSON.stringify({ model, policy })], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "policy-bundle.json";
        a.click();
    }
    return (_jsxs("div", { style: { display: "grid", gap: 12 }, children: [_jsx("h2", { children: "Editor de Pol\u00EDticas (RBAC/ABAC)" }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [_jsxs("div", { children: [_jsx("h3", { children: "model.conf" }), _jsx("textarea", { value: model, onChange: e => setModel(e.target.value), style: { width: "100%", minHeight: 320, fontFamily: "monospace" } })] }), _jsxs("div", { children: [_jsx("h3", { children: "policy.csv" }), _jsx("textarea", { value: policy, onChange: e => setPolicy(e.target.value), style: { width: "100%", minHeight: 320, fontFamily: "monospace" } })] })] }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("button", { onClick: validate, children: "Validar (ejemplo)" }), _jsx("button", { onClick: exportBundle, children: "Exportar bundle" })] }), msg && _jsx("pre", { style: { background: "#f7f7f7", padding: 8, borderRadius: 6 }, children: msg }), activeVersion && _jsxs("small", { children: ["Versi\u00F3n activa: ", activeVersion] })] }));
}
