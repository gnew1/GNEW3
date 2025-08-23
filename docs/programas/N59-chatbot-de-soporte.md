GNEW N59 — 6.9 Chatbot de soporte (Prompt 59)
Objetivo
Resolver dudas comunes (Nivel 0 / L0) con RAG sobre la KB, citando fuentes y escalar sin fricción a humano cuando haga falta, con verificación previa para acciones sensibles.
Roles responsables
●	Data/ML (owner técnico del RAG): ranking, umbrales, métricas.

●	Soporte: macros, panel de handoff, CSAT.

●	Seguridad: guardrails, límites de acción, verificación reforzada.

Stack & convenciones
●	RAG: índice semántico local (reuso help-index.json de N58) + re-rank simple.

●	Guardrails: filtros de contenido y límite de herramientas (whitelist).

●	Backend: Node/TS + Fastify, Postgres (conversaciones, feedback, escalados), Redis (rate limit), OpenTelemetry→Prometheus.

●	Frontends: Web (React 18 + Vite/TS) y Móvil (React Native + Expo) con el mismo API.

●	Privacidad: contexto minimizado (DID, estado básico), no PII; opt out.

●	CI/CD: GitHub Actions (matriz node), deploy gated por Seguridad+Gobernanza.

●	Docs: Docusaurus “Arquitectura”, “APIs”, “Guardrails”, “Runbooks”.

●	DoD genérico: código+tests+docs+dashboards+playbooks; demo reproducible.

 
Entregables
1.	Bot embebido en web y móvil con citaciones a artículos MDX.

2.	Panel de handoff para agentes (ver/aceptar chats, macros, cierre).

3.	Conector de contexto (cuenta/estado) con privacidad por diseño.

4.	Flujos de verificación antes de sugerir/ejecutar acciones sensibles.

5.	Métricas: CSAT, tasa de resolución L0, tiempo a resolución, escalados.

 
1) Servicio “support-bot” (backend)
services/support-bot/
  package.json
  tsconfig.json
  src/
    index.ts
    env.ts
    db.ts
    redis.ts
    otel.ts
    metrics.ts
    rag/
      retriever.ts      # carga help-index.json y busca (cosine)
      rerank.ts         # heurística simple por sección/audiencia
      chain.ts          # orquestación: retrieve → redactar → citar/fallback
    guardrails/
      filters.ts        # regex/heurísticos (seed phrase, PII, phishing)
      tools.ts          # whitelist de acciones
    context/
      buildContext.ts   # consulta estado mínimo (rol, tickets abiertos) con DID
      verify.ts         # challenge/verify (puente con N56)
    routes/
      chat.ts           # POST /chat (mensajes), SSE para streaming opcional
      handoff.ts        # GET/POST handoff (agentes)
      verify.ts         # endpoints de verificación
    llm/
      provider.ts       # interfaz; modo “local-templated” por defecto
  migrations/
    001_init.sql
  Dockerfile
