import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export function DebatePanel({ apiBase = "/debate-assistant", threadId, }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`${apiBase}/panel/${threadId}`);
                if (!res.ok)
                    throw new Error("failed");
                const json = await res.json();
                if (mounted)
                    setData(json);
            }
            catch (e) {
                setErr("No se pudo cargar el panel");
            }
            finally {
                setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [threadId, apiBase]);
    if (loading)
        return _jsx("div", { children: "Generando TL;DR\u2026" });
    if (err)
        return _jsx("div", { role: "alert", children: err });
    if (!data)
        return null;
    return (_jsxs("div", { className: "max-w-4xl mx-auto space-y-6", children: [_jsxs("header", { children: [_jsx("h2", { className: "text-xl font-semibold", children: "TL;DR" }), _jsx("p", { className: "mt-2 leading-relaxed", children: data.tldr })] }), _jsxs("section", { children: [_jsx("h3", { className: "font-semibold", children: "Argumentos clave" }), _jsx("ol", { className: "list-decimal list-inside space-y-2", children: data.key_arguments.map((a, i) => (_jsx("li", { className: "bg-gray-50 rounded p-3", children: a }, i))) })] }), _jsxs("section", { children: [_jsx("h3", { className: "font-semibold", children: "Etiquetas" }), _jsx("div", { className: "flex flex-wrap gap-2", children: data.tags.map((t, i) => (_jsx("span", { className: "px-2 py-1 rounded-full text-sm \nborder", children: t }, i))) })] }), _jsxs("section", { children: [_jsx("h3", { className: "font-semibold", children: "Agenda sugerida" }), data.agenda.length ? (_jsx("ul", { className: "list-disc list-inside space-y-1", children: data.agenda.map((x, i) => _jsx("li", { children: x }, i)) })) : (_jsx("p", { className: "text-sm text-gray-500", children: "Sin acciones detectadas." }))] })] }));
}
