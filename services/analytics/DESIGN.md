# M10 Query Engine — Diseño

Objetivo: Ejecución de queries privadas (subset) con stub zk-SNARK.

Interfaces
- plan(query): ExecutionPlan
- run(plan, params): {rows, proof?}

Datos
- DSL restringido (SELECT agg FROM table WHERE filters LIMIT N).

Dependencias
- Parser seguro; motor in-memory o connectores; circuito zk (futuro).

Seguridad
- Column-level allowlist; filtros por tenant; límites de tiempo/memoria.

Observabilidad
- Métricas: qps, p95_latency, rows_read, proofs_generated.

Configuración
- Fuente datos (substreams|lake|db), límites por query, features.

Edge cases
- Cartesian explosion; timeouts; tipos inválidos; OOM.

DoD
- Queries básicas (count,sum,avg) con tests; límites aplicados; stub de prueba.
