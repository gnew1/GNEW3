import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
export const SurveyModal = ({ survey, userId, event, onClose, endpoint = "/feedback" }) => {
    const [answers, setAnswers] = useState({});
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    function setAnswer(qid, value) {
        setAnswers((a) => ({ ...a, [qid]: value }));
    }
    async function submit() {
        setSubmitting(true);
        try {
            await fetch(`${endpoint}/responses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ survey_id: survey.id, event, user_id: userId, answers, comment }),
            });
            setSubmitted(true);
            setTimeout(onClose, 1200);
        }
        catch {
            setSubmitting(false);
        }
    }
    const scaleRow = (q, min, max) => (_jsx("div", { role: "group", "aria-labelledby": `label-${q.id}`, style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: Array.from({ length: max - min + 1 }).map((_, i) => {
            const value = i + min;
            const selected = answers[q.id] === value;
            return (_jsx("button", { "aria-pressed": selected, onClick: () => setAnswer(q.id, value), className: "focus:outline focus:outline-2 focus:outline-[var(--primary)]", style: {
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #E5E7EB",
                    background: selected ? "var(--primary, #0052CC)" : "white",
                    color: selected ? "white" : "var(--text, #1C1C1E)",
                    cursor: "pointer",
                }, children: value }, value));
        }) }));
    return (_jsx("div", { role: "dialog", "aria-modal": "true", style: { position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 1000 }, children: _jsxs("div", { style: { background: "white", borderRadius: 16, padding: 20, width: "min(560px, 92vw)" }, children: [_jsx("h2", { id: "survey-title", style: { marginTop: 0 }, children: survey.name }), submitted ? (_jsx("p", { role: "status", children: "\u00A1Gracias por tu feedback!" })) : (_jsxs(_Fragment, { children: [survey.questions.map((q) => (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { id: `label-${q.id}`, htmlFor: `q-${q.id}`, style: { display: "block", fontWeight: 600, marginBottom: 6 }, children: q.label }), q.type === "nps" && scaleRow(q, 0, 10), q.type === "csat" && scaleRow(q, 1, (q.scale ?? 5)), q.type === "text" && (_jsx("textarea", { id: `q-${q.id}`, "aria-label": q.label, value: answers[q.id] ?? "", onChange: (e) => setAnswer(q.id, e.target.value), style: { width: "100%", minHeight: 80, padding: 10, border: "1px solid #E5E7EB", borderRadius: 8 } }))] }, q.id))), _jsxs("div", { style: { marginTop: 8 }, children: [_jsx("label", { htmlFor: "comment", style: { display: "block", fontWeight: 600, marginBottom: 6 }, children: "Comentario adicional (opcional)" }), _jsx("textarea", { id: "comment", value: comment, onChange: (e) => setComment(e.target.value), style: { width: "100%", minHeight: 70, padding: 10, border: "1px solid #E5E7EB", borderRadius: 8 } })] }), _jsxs("div", { style: { display: "flex", gap: 12, marginTop: 16 }, children: [_jsx("button", { onClick: onClose, disabled: submitting, className: "focus:outline focus:outline-2 focus:outline-[var(--primary)]", style: { padding: "8px 16px", borderRadius: 8, border: "1px solid #E5E7EB", background: "white", cursor: "pointer" }, children: "Omitir" }), _jsx("button", { onClick: submit, disabled: submitting, className: "focus:outline focus:outline-2 focus:outline-[var(--primary)]", style: { padding: "8px 16px", borderRadius: 8, background: "#0052CC", color: "white", cursor: "pointer" }, children: submitting ? "Enviando…" : "Enviar" })] })] }))] }) }));
};
