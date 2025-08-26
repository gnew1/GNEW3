import React, { useState } from "react";
import type { Survey, Question } from "./types";

type Props = Readonly<{
  survey: Survey;
  userId: string;
  event: string;
  onClose: () => void;
  endpoint?: string; // e.g. /feedback
}>;

export const SurveyModal: React.FC<Props> = ({ survey, userId, event, onClose, endpoint = "/feedback" }) => {
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function setAnswer(qid: string, value: number | string) {
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
    } catch {
      setSubmitting(false);
    }
  }

  const scaleRow = (q: Question, min: number, max: number) => (
    <div role="group" aria-labelledby={`label-${q.id}`} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {Array.from({ length: max - min + 1 }).map((_, i) => {
        const value = i + min;
        const selected = answers[q.id] === value;
        return (
          <button
            key={value}
            aria-pressed={selected}
            onClick={() => setAnswer(q.id, value)}
            className="focus:outline focus:outline-2 focus:outline-[var(--primary)]"
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #E5E7EB",
              background: selected ? "var(--primary, #0052CC)" : "white",
              color: selected ? "white" : "var(--text, #1C1C1E)",
              cursor: "pointer",
            }}
          >
            {value}
          </button>
        );
      })}
    </div>
  );

  return (
    <div role="dialog" aria-modal="true" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)", display:"grid", placeItems:"center", zIndex:1000 }}>
      <div style={{ background:"white", borderRadius:16, padding:20, width:"min(560px, 92vw)" }}>
        <h2 id="survey-title" style={{ marginTop:0 }}>{survey.name}</h2>
        {submitted ? (
          <p role="status">¡Gracias por tu feedback!</p>
        ) : (
          <>
            {survey.questions.map((q) => (
              <div key={q.id} style={{ marginBottom: 16 }}>
                <label id={`label-${q.id}`} htmlFor={`q-${q.id}`} style={{ display:"block", fontWeight:600, marginBottom:6 }}>
                  {q.label}
                </label>
                {q.type === "nps" && scaleRow(q, 0, 10)}
                {q.type === "csat" && scaleRow(q, 1, (q.scale ?? 5))}
                {q.type === "text" && (
                  <textarea
                    id={`q-${q.id}`}
                    aria-label={q.label}
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    style={{ width:"100%", minHeight:80, padding:10, border:"1px solid #E5E7EB", borderRadius:8 }}
                  />
                )}
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <label htmlFor="comment" style={{ display:"block", fontWeight:600, marginBottom:6 }}>Comentario adicional (opcional)</label>
              <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)}
                style={{ width:"100%", minHeight:70, padding:10, border:"1px solid #E5E7EB", borderRadius:8 }} />
            </div>
            <div style={{ display:"flex", gap:12, marginTop:16 }}>
              <button onClick={onClose} disabled={submitting} className="focus:outline focus:outline-2 focus:outline-[var(--primary)]"
                style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #E5E7EB", background:"white", cursor:"pointer" }}>
                Omitir
              </button>
              <button onClick={submit} disabled={submitting} className="focus:outline focus:outline-2 focus:outline-[var(--primary)]"
                style={{ padding:"8px 16px", borderRadius:8, background:"#0052CC", color:"white", cursor:"pointer" }}>
                {submitting ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

