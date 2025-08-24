# Gateway Summarizer — Diseño

Objetivo: Resumen de solicitudes/respuestas con preservación de privacidad.

Interfaces
- summarize(request, response, context): {summary, tokens, redactions}
- budget.consume(tenant, tokens): ok|deny

Privacidad y límites
- Redacción de PII (regex + clasificadores);
- Presupuestos por tenant (tokens/min, req/min);
- Hash salado de identificadores; ventanas deslizantes.

Seguridad
- Autenticación (mTLS/JWT); firma de logs; storage cifrado.

Observabilidad
- Métricas: summaries, redactions, budget_denied, p95.

Configuración
- Catálogo de PII; límites por plan; backends (OpenAI/local).

Edge cases
- Payloads grandes; PII encubierta; picos de tráfico.

DoD
- Pipeline de redacción con pruebas; rate limit efectivo; mocks de LLM.
