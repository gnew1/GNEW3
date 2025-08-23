# N67 — Control de acceso descentralizado (RBAC/ABAC gobernado por DAO)

## Objetivo
- **DAO gobierna** la **versión** de políticas (on-chain `PolicyRegistry`).
- Servicio **authz** aplica políticas en < 50 ms y registra logs trazables.
- **Stack**: Casbin (modelo RBAC+ABAC), OPA opcional futurizable (WASM), cache off-chain.

## Flujo
1. Gobernanza (DAO) **activa** una versión de política: `(version, uri, hash)` en `PolicyRegistry`.
2. **Authz** escucha el evento `PolicyActivated`, descarga `uri`, **verifica `hash`**, recompila el enforcer y purga cache.
3. Clientes llaman `POST /authz/evaluate` con `sub/obj/act/ctx`. Respuesta incluye `decisionId`, `policyVersion`, latencia.
4. **Auditoría**: logs estructurados + métricas Prometheus (`authz_eval_ms`, `authz_requests_total`).

## Roles y atributos por contexto
- **Subject**: `{ id, role, tenant, department?, clearance?, attributes? }`.
- **Context**: `{ tenant, projectOwnerId?, resourceOwnerId?, ... }`.
- **Política**: RBAC (roles jerárquicos) + **ABAC** (condiciones en `p.cond`).

## Versionado y auditoría
- On-chain: `PolicyRegistry` con `stagePolicy` y `activatePolicy` (eventos, timestamps).
- Off-chain: `authz` mantiene `policyVersion` y traza cada decisión con `X-Decision-Id`, correlacionable en SIEM.

## DoD
- **Evaluación < 50 ms** (bench `src/bench.ts` + histograma).
- **Logs trazables** (incluye `decisionId`, `policyVersion`, `sub.id`, `role`, `obj`, `act`, `tenant`).
- **Cache on/off-chain** con invalidación inmediata en `PolicyActivated`.

