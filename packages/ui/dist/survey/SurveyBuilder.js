import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
export const SurveyBuilder = ({ endpoint = "/feedback" }) => {
    const [name, setName] = useState("");
    const [trigger, setTrigger] = useState("post-votacion");
    const [locale, setLocale] = useState("en");
    const [frequency, setFrequency] = useState(30);
    const [questions, setQuestions] = useState([
        { id: "nps", type: "nps", label: "¿Qué probabilidad hay de que recomiendes GNEW? (0-10)", scale: 11 },
        { id: "txt", type: "text", label: "¿Qué mejorarías?" },
    ]);
    const [status, setStatus] = useState(null);
    function addQuestion(q) { setQuestions((qs) => [...qs, q]); }
    function rmQuestion(id) { setQuestions((qs) => qs.filter(q => q.id !== id)); }
    async function save() {
        setStatus("Guardando…");
        const res = await fetch(`${endpoint}/surveys`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, trigger, locale, frequency_days: frequency, questions }),
        });
        setStatus(res.ok ? "Creada ✅" : "Error ❌");
    }
    return (_jsxs("div", { style: { display: "grid", gap: 12, maxWidth: 820 }, children: [_jsx("h2", { children: "Survey Builder" }), _jsxs("label", { children: ["Nombre ", _jsx("input", { value: name, onChange: (e) => setName(e.target.value) })] }), _jsxs("label", { children: ["Trigger", _jsxs("select", { value: trigger, onChange: (e) => setTrigger(e.target.value), children: [_jsx("option", { value: "post-onboarding", children: "post-onboarding" }), _jsx("option", { value: "post-votacion", children: "post-votaci\u00F3n" }), _jsx("option", { value: "post-issue", children: "post-issue" })] })] }), _jsxs("label", { children: ["Locale", _jsxs("select", { value: locale, onChange: (e) => setLocale(e.target.value), children: [_jsx("option", { children: "en" }), _jsx("option", { children: "es" })] })] }), _jsxs("label", { children: ["Frecuencia (d\u00EDas) ", _jsx("input", { type: "number", value: frequency, min: 7, onChange: (e) => setFrequency(parseInt(e.target.value || "30")) })] }), _jsxs("div", { children: [_jsx("h3", { children: "Preguntas" }), questions.map(q => (_jsxs("div", { style: { border: "1px solid #EEE", borderRadius: 8, padding: 10, marginBottom: 8 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("b", { children: q.type.toUpperCase() }), " ", _jsx("button", { onClick: () => rmQuestion(q.id), children: "Eliminar" })] }), _jsxs("div", { children: ["ID: ", q.id] }), _jsxs("div", { children: ["Label: ", q.label] })] }, q.id))), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("button", { onClick: () => addQuestion({ id: `csat-${Date.now()}`, type: "csat", label: "Satisfacción (1-5)", scale: 5 }), children: "+ CSAT" }), _jsx("button", { onClick: () => addQuestion({ id: `text-${Date.now()}`, type: "text", label: "Comentario" }), children: "+ Texto" })] })] }), _jsx("button", { onClick: save, style: { padding: "8px 16px" }, children: "Guardar encuesta" }), status && _jsx("div", { role: "status", children: status })] }));
};
