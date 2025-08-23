import { resolvePolicyFor } from "../src/services/engine"; 
import { prisma } from "../src/infra/prisma"; 
 
describe("resolvePolicyFor", () => { 
  beforeAll(async () => { 
    await prisma.retentionPolicy.create({ 
      data: { version: "vtest", scope: { purpose: "marketing", 
baseLegal: "consent" }, action: "delete", ttlDays: 180, isActive: true 
} 
    }); 
  }); 
  it("matches rule by purpose/baseLegal", async () => { 
    const pol = await resolvePolicyFor({ system: 
"postgres:core.users", dataCategory: "email", purpose: "marketing", 
baseLegal: "consent" }); 
    expect(pol.ttlDays).toBe(180); 
    expect(pol.action).toBe("delete"); 
  }); 
}); 
Métricas & Dashboards 
● KPIs: 
○ % registros con tag de retención por sistema. 
○ purgas/día, fallos, retries, tiempo medio de enforcement. 
○ días hasta expiración media por categoría/propósito. 
● Alertas: 
○ Tags vencidos > X durante Y minutos. 
○ Políticas desactivadas o versión desfasada vs archivo YAML. 
● OTel: 
○ Spans: tagResource, enforceDueTags, anchorBatch. 
○ Atributos: system, action, data_category, nunca PII. 
Playbooks (operativos) 
1. Cargar/actualizar políticas 
POST /v1/retention/policies/reload tras PR aprobado del YAML → snapshot 
en DB (versión activa). 
2. Registro de recursos (SDK) 
Servicios productores obligados a llamar tagResource() en creación/ingesta. 
Linters de PR detectan olvidos. 
3. Aceleración por withdraw 
POST /v1/retention/tags/accelerate (desde consent-svc) al retirarse 
consentimiento → expireAt=now(). 
4. Barrido y evidencia 
sweep-expirations corre cada 10–15 min → ejecuta conector → registra 
RetentionEvent con eventHash → ancla Merkle root → consolida 
batchId/txHash. 
5. Legal hold 
Si existe LegalHold para el recurso, el enforcer devuelve skip_hold y abre alerta. 
6. Verificación externa 
Dado un eventHash, se puede probar inclusión en el batch anclado (Merkle proof — 
siguiente iteración si lo deseas). 
DoD — Demostración 
● Crear políticas → reload (200). 
● Crear usuario/archivo y registrar tag → ver expireAt. 
● Simular withdraw → accelerate → correr sweep-expirations → evento 
delete/anonymize creado, txHash presente. 
● Ver métricas: purgas/día > 0; sin PII en logs. 
● Auditoría: recuperar RetentionEvent con eventHash y batchId/txHash. 
Variables de entorno 
DATABASE_URL=postgres://... 
RETENTION_API=https://retention-svc... 
RPC_URL=... 
ANCHOR_PK=0x... 
CONSENT_ANCHOR_ADDR=0x... 
¿Quieres que añada en la siguiente entrega Merkle proofs para verificar inclusión desde la 
consola y un linter de PII en CI que falle el build si detecta patrones peligrosos en logs/código? 
Tú dijiste: 
programa a nivel de detalle para GNEW N133 14.3 Consentimiento granular (Prompt 133) 
Objetivo: Gestión por finalidad y canal. Roles: Back, Front. DoD: banner/flows; pruebas legales. 
ChatGPT Plus 
Pensó durante 44s 
