import { screen } from "../src/services/engine"; 
import { prisma } from "../src/infra/prisma"; 
 
describe("screening engine", () => { 
  beforeAll(async () => { 
    await prisma.watchlistItem.createMany({ 
      data: [ 
        { sourceKey: "ofac_sdn", kind: "person", name: "Juan Perez 
Garcia", aliases: ["J. P. Garcia"], raw: {} }, 
        { sourceKey: "ofac_wallets", kind: "wallet", name: "Wallet 
Sanctioned", wallet: "0xabc123", raw: {} } 
      ] 
    }); 
}); 
it("flags strong name match as review/blocked", async () => { 
const run = await screen({ subjectId: "subj1", name: "Juan P. 
Garcia", country: "ES" }); 
expect(["review","blocked"]).toContain(run.decision); 
}); 
it("blocks exact wallet match", async () => { 
const run = await screen({ subjectId: "subj2", wallets: 
["0xAbC123"] }); 
expect(run.decision).toBe("blocked"); 
}); 
}); 
Métricas y paneles 
● Listas: última actualización por fuente, sha256, conteo de items, % éxito/errores. 
● Screening: decisiones por día (clear/review/blocked), TPR/FPR (con etiqueta de 
revisión), tiempos P95. 
● Cumplimiento: % transacciones bloqueadas, tiempo de resolución de “review”. 
● Alertas: 
○ Fuente no actualizada > 24h → CRITICAL. 
○ Run blocked sin anclaje asignado en > 2h. 
Playbooks 
1. Operación diaria 
○ Ver /v1/watchlists/status → todas en verde (fetchedAt < 24h). 
○ Revisar colas/anchorage; confirmar txHash en runs recientes. 
2. Revisión manual (review) 
○ Soporte/Cumplimiento consulta /v1/screening/hits/{runId} → compara 
campos (dob, país, alias). 
○ Si falso positivo → crear allowlist con expiresAt (p. ej. 90 días). 
○ Si positivo → mantener blocked y documentar. 
3. Evidencia de bloqueo 
○ Guardar run.evidence (match detail), eventHash, batchId, txHash. 
○ En auditoría, recomputar hash local y verificar inclusión de eventHash en 
Merkle del batchId. 
4. Privacidad 
○ No volcar PII en logs; input se guarda como seudonimizado (subjectId); 
nombres/fechas en evidence → encriptar en reposo. 
DoD — Demostración 
● Listas actualizadas: ejecutar /v1/watchlists/refresh (o esperar cron) → 
/status muestra fetchedAt reciente y sha256. 
● Bloqueo: POST /v1/screening/check con wallet sancionado → 
decision=blocked; sujeto queda blocked. 
● Evidencia: GET /v1/screening/hits/{runId} devuelve evidence, eventHash 
y (tras job) txHash. 
● Middleware: en payments-svc probar endpoint protegido → respuesta 451 Subject 
blocked by sanctions screening. 
Variables de entorno 
DATABASE_URL=postgres://... 
SCREENING_API=https://screening-svc.internal 
RPC_URL=... 
ANCHOR_PK=0x... 
CONSENT_ANCHOR_ADDR=0x... 
REFRESH_MINUTES=240 
Notas de cumplimiento (operativas) 
● PEP ≠ sancionado: PEP → review y controles adicionales (limitar montos, aprobación 
humana). 
● Países embargados: opción de bloquear por country_of_residence/ip_geo si 
coincide con embargos listados (añadir tabla EmbargoCountry si aplica). 
● Proveedores comerciales: integrar conectores (p. ej. REST/HMAC) en 
packages/screening-connectors/src/vendor.ts con mapeo a 
WatchlistItem. 
● Calibración: ajustar umbrales (0.88 review, 0.94 block) con dataset rotulado; registrar 
ROC en docs. 
¿Quieres que añada ahora un panel React para revisión manual (cola de “review” con diffs y 
botón “Allowlist 90 días”) y un conector vendor de ejemplo (HMAC + firma) para un proveedor 
comercial? 
Tú dijiste: 
programa a nivel de detalle N135 14.5 Policy-as-Code (Prompt 135) Objetivo: OPA para 
decisiones (acceso, pagos). Roles: Seguridad, Back. DoD: tests de políticas; versionado. 
ChatGPT Plus 
Pensó durante 1m 23s 
/apps/pdp-svc — GNEW N135 · 14.5 Policy‑as‑Code con OPA (acceso y pagos) 
A continuación tienes el programa a nivel de detalle con arquitectura, Rego (OPA), PDP 
(Policy Decision Point), PEP (enforcement/middlewares), contratos de entrada/salida, tests de 
políticas, versionado y bundles, CI/CD, observabilidad y playbooks. Coherente con 
N130–N134: seudonimización, OTel, anclaje auditable, GitFlow. 
 
Arquitectura (alto nivel) 
● PEP (Policy Enforcement Point): middlewares en servicios (api-gw, payments-svc) 
que llaman al PDP antes de ejecutar. 
 
● PDP (apps/pdp-svc): API interna que prepara contexto, consulta OPA (sidecar o 
REST local) y devuelve decisión + obligaciones. 
 
● OPA (Open Policy Agent): corre como sidecar junto al PDP y servicios críticos; carga 
bundles versionados con Rego y datos. 
 
● Policy Registry: publicación de bundles (SemVer) en OCI o S3; ejemplo incluido con 
servidor estático. 
 
● Tests y versionado: opa test + conftest en CI; tags SemVer disparan build y 
publicación del bundle. 
 
 
Estructura del repo (nuevo) 
policies/ 
  n135/ 
    access/ 
      authz.rego 
      authz_test.rego 
    payments/ 
      decision.rego 
      decision_test.rego 
    common/ 
      data.json         # umbrales, países embargados, roles↔acciones 
apps/ 
  pdp-svc/             # Policy Decision Point (TypeScript + Express) 
    src/... 
    opa/config.yaml    # configuración OPA sidecar (bundles + decision 
logs) 
  policy-registry-svc/ # (opcional) servidor de bundles estáticos 
packages/ 
  policy-contracts/    # JSON Schemas de entrada/salida (acceso/pagos) 
  policy-guard/        # SDK de cliente para PEP (enforcement) 
