import { render, screen } from "@testing-library/react";
import React from "react";
import { SurveyModal } from "../src/survey/SurveyModal";
import type { Survey } from "../src/survey/types";

const survey: Survey = {
  id: 1, name: "Test", trigger: "post-votacion", locale: "en", frequency_days: 30,
  questions: [{ id:"nps", type:"nps", label:"NPS" }, { id:"txt", type:"text", label:"Coment" }]
};

it("renders survey and can submit", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true });
  render(<SurveyModal survey={survey} event="post-votacion" userId="u1" onClose={()=>{}} endpoint="/feedback" />);
  expect(screen.getByText(/Test/)).toBeInTheDocument();
  screen.getByRole('button', { name: "10" }).click();
  screen.getByRole('button', { name: /Enviar/ }).click();
  expect(await screen.findByText(/Gracias/)).toBeInTheDocument();
});

 
Cómo integrar en el monorepo
1.	Service: añade services/feedback/ al monorepo. Incluye en tu docker-compose o manifiestos K8s, y registra en el gateway una ruta /feedback → services/feedback.

2.	UI: publica los nuevos exports en packages/ui (ya provisto en index.ts).

Uso in-app (ejemplo React):

 import { useSurveyTrigger, SurveyModal } from "@gnew/ui/survey";

export default function PostVotePage({ userId }: { userId: string }) {
  const { survey, open, setOpen } = useSurveyTrigger("post-votacion", userId, "/feedback");
  return <>
    {/* ...contenido... */}
    {open && survey && (
      <SurveyModal survey={survey} userId={userId} event="post-votacion" onClose={()=>setOpen(false)} endpoint="/feedback" />
    )}
  </>;
}
3.	
4.	Dashboards: engancha /metrics a Prometheus y crea paneles de:

○	gnew_feedback_responses_total{trigger=...,nps_bucket=...}

○	gnew_survey_created_total

○	gnew_survey_response_latency_seconds (si mides timestamps de evento vs respuesta en el cliente).

 
Datos de ejemplo para crear una encuesta (curl)
curl -X POST http://localhost:8000/surveys \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"Post-votación NPS",
    "trigger":"post-votacion",
    "locale":"es",
    "frequency_days":30,
    "questions":[
      {"id":"nps","type":"nps","label":"¿Recomendarías GNEW? (0-10)","scale":11},
      {"id":"csat","type":"csat","label":"Satisfacción (1-5)","scale":5},
      {"id":"comment","type":"text","label":"¿Qué mejorarías?"}
    ]
  }'

 
Con esto tienes: Survey Builder, microsurveys in app, webhooks/metrics, cálculo NPS y controles de frecuencia. ¿Quieres que también te genere un dashboard JSON de Grafana con panels preconfigurados y una acción semanal que alimente el backlog de mejoras?
Tú dijiste:
programa a nivel de detallle para GNEW N61 7.1 Mejores prácticas de contratos (Prompt 61) Objetivo: Estándares de seguridad en todos los SC. Roles: Seguridad, Eng. SC. Stack: OpenZeppelin, checks-effects-interactions, custom errors. Entregables: Guía de patrones, plantillas seguras. Pasos: Revisiones de diseño (“threat modeling”). Librería de utilidades verificada. DoD: Zero high/critical pendientes.
ChatGPT Plus
Pensó durante 49s
