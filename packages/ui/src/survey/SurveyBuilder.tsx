import React, { useState } from "react";
import type { Question } from "./types";

type Props = { endpoint?: string };
export const SurveyBuilder: React.FC<Props> = ({ endpoint = "/feedback" }) => {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("post-votacion");
  const [locale, setLocale] = useState("en");
  const [frequency, setFrequency] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([
    { id: "nps", type: "nps", label: "¿Qué probabilidad hay de que recomiendes GNEW? (0-10)", scale: 11 },
    { id: "txt", type: "text", label: "¿Qué mejorarías?" },
  ]);
  const [status, setStatus] = useState<string | null>(null);

  function addQuestion(q: Question) { setQuestions((qs) => [...qs, q]); }
  function rmQuestion(id: string) { setQuestions((qs) => qs.filter(q => q.id !== id)); }

  async function save() {
    setStatus("Guardando…");
    const res = await fetch(`${endpoint}/surveys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, trigger, locale, frequency_days: frequency, questions }),
    });
    setStatus(res.ok ? "Creada ✅" : "Error ❌");
  }

  return (
    <div style={{ display:"grid", gap:12, maxWidth:820 }}>
      <h2>Survey Builder</h2>
      <label>Nombre <input value={name} onChange={(e)=>setName(e.target.value)} /></label>
      <label>Trigger
        <select value={trigger} onChange={(e)=>setTrigger(e.target.value)}>
          <option value="post-onboarding">post-onboarding</option>
          <option value="post-votacion">post-votación</option>
          <option value="post-issue">post-issue</option>
        </select>
      </label>
      <label>Locale
        <select value={locale} onChange={(e)=>setLocale(e.target.value)}>
          <option>en</option><option>es</option>
        </select>
      </label>
      <label>Frecuencia (días) <input type="number" value={frequency} min={7} onChange={(e)=>setFrequency(parseInt(e.target.value||"30"))} /></label>

      <div>
        <h3>Preguntas</h3>
        {questions.map(q=>(
          <div key={q.id} style={{ border:"1px solid #EEE", borderRadius:8, padding:10, marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <b>{q.type.toUpperCase()}</b> <button onClick={()=>rmQuestion(q.id)}>Eliminar</button>
            </div>
            <div>ID: {q.id}</div>
            <div>Label: {q.label}</div>
          </div>
        ))}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>addQuestion({ id: `csat-${Date.now()}`, type:"csat", label:"Satisfacción (1-5)", scale:5 })}>+ CSAT</button>
          <button onClick={()=>addQuestion({ id: `text-${Date.now()}`, type:"text", label:"Comentario" })}>+ Texto</button>
        </div>
      </div>

      <button onClick={save} style={{ padding:"8px 16px" }}>Guardar encuesta</button>
      {status && <div role="status">{status}</div>}
    </div>
  );
};

