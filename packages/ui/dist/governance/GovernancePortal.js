import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export const GovernancePortal = ({ apiBase = "/governance" }) => {
    const [proposals, setProposals] = useState([]);
    const [selected, setSelected] = useState(null);
    const [participation, setParticipation] = useState("—");
    useEffect(() => {
        // En un entorno real, obtener desde subgraph/Tally. Aquí 
        mock / fetch.
        (async () => {
            const resp = await fetch(`${apiBase}/proposals`).catch(() => null);
            if (resp?.ok) {
                setProposals(await resp.json());
            }
            else {
                setProposals([]);
            }
        })();
    }, [apiBase]);
    const loadParticipation = async (p) => {
        const r = await fetch(`${apiBase}/participation/${p.id}`).then(r => r.json());
        setParticipation((r.participation * 100).toFixed(2) + "%");
    };
    return (_jsxs("div", { className: "grid gap-4 p-4", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Gobernanza GNEW" }), _jsx("div", { className: "text-sm text-gray-500", children: "Snapshot + Governor + Timelock" })] }), _jsx("section", { className: "grid md:grid-cols-3 gap-3", children: proposals.map(p => (_jsxs("button", { onClick: () => { setSelected(p); loadParticipation(p); }, className: "text-left rounded-2xl shadow p-4 \nhover:shadow-md", children: [_jsx("div", { className: "text-xs uppercase tracking-wide \ntext-gray-500", children: p.status }), _jsx("div", { className: "text-lg font-medium", children: p.title }), _jsx("div", { className: "text-sm text-gray-600 \nline-clamp-3", children: p.description }), _jsxs("div", { className: "mt-2 text-xs", children: ["For: ", p.forVotes, " \u2022 Against:", p.againstVotes, " \u2022 Abstain: ", p.abstainVotes] })] }, p.id))) }), selected && (_jsxs("aside", { className: "rounded-2xl shadow p-4", children: [_jsx("h2", { className: "text-xl font-semibold", children: selected.title }), _jsx("p", { className: "text-sm text-gray-600 \nmt-1", children: selected.description }), _jsxs("div", { className: "mt-3 text-sm", children: ["Participaci\u00F3n (for+abstain/totalSupply):", _jsx("b", { children: participation })] }), _jsxs("div", { className: "mt-4 flex gap-2", children: [_jsx("button", { className: "rounded-xl px-4 py-2 shadow", onClick: () => window.alert("Cast vote FOR (wire to wallet)"), children: "Votar FOR" }), _jsx("button", { className: "rounded-xl px-4 py-2 shadow", onClick: () => window.alert("Cast vote AGAINST"), children: "Votar AGAINST" }), _jsx("button", { className: "rounded-xl px-4 py-2 shadow", onClick: () => window.alert("Cast vote ABSTAIN"), children: "Abstenerse" })] })] }))] }));
};
Puedes;
exponer;
el;
API;
de;
governance;
bajo / governance;
desde;
el;
gateway;
o;
vía;
nginx;
para;
que;
el;
portal;
funcione;
out - of - the - box.
;
Plantillas;
de;
propuestas(on - chain / off - chain);
