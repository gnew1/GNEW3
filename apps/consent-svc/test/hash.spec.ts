import { hashEvent, canonicalJson } from 
"../src/services/consent-core"; 
 
describe("hashEvent", () => { 
  it("is stable and order-independent for keys", () => { 
    const a = { b: 1, a: 2 }; 
    const b = { a: 2, b: 1 }; 
    expect(hashEvent(a)).toEqual(hashEvent(b)); 
  }); 
  it("changes with payload changes", () => { 
    const h1 = hashEvent({ x: 1 }); 
    const h2 = hashEvent({ x: 2 }); 
    expect(h1).not.toEqual(h2); 
  }); 
}); 
 
 
Taxonomía inicial (ejemplo) 
● Usos (processing_use): strictly_necessary (no toggle), 
security_antiabuse, notifications, analytics, personalization, 
marketing, research. 
● Categorías de datos (data_category): email, wallet_id, ip, device_id, 
onchain_activity_bucket, messages_meta. 
● Propósitos (purpose): account_access, fraud_mitigation, 
experience_quality, community_insights, growth_marketing, 
product_research. 
● Base legal: por defecto consent salvo 
strictly_necessary/security_antiabuse (interés legítimo con opt‑out) y 
obligaciones legales. 
Integraciones y Señales 
● GPC/DNT: endpoint POST /signals/gpc + auto‑aplicación “deny” a 
marketing/personalization donde aplique. Registrar honored=true y motivo. 
● Webhooks firmados: cuando cambia un consentimiento, notificar a servicios 
consumidores (marketing, analytics) para borrar o dejar de usar datos según política. 
Observabilidad & Seguridad 
● OpenTelemetry: traza por request, span en escritura con atributos: 
subject_pseudo_id, purpose_key, use_key, state; no registrar PII. 
● PII: seudonimización, separación de identidad real, cifrado en reposo, TTL para 
señales y retención mínima. 
● Threat model: suplantación de sujeto (mitigar con requireSubjectAuth + proof of 
possession wallet/email), replays (nonce+jti), abuso API (rate limit). 
Playbooks 
● Anclaje: cron/queue cada 15–60 min → Merkle → ConsentAnchor → guardar 
tx_hash. Runbook para reintentos/rollback seguro (si tx falla, reanclar lote). 
● Verificación externa: dado receipt_id, devolver evento y tx_hash; permitir a 
terceros recomputar hash y probar inclusión (proveer Merkle proof en próxima 
iteración). 
● DSAR: exportación firmada y auto‑expirable. Borrado: respetar supresión excepto 
retener “prueba de consentimiento” despersonalizada(1). 
(1) Retener hashes/eventos sin PII directa para defensa de cumplimiento. 
Roadmap (sprints sugeridos) 
● S1 (1‑2 sem): Esquema DB, API read, catálogo, UI matriz básica, hashing y eventos. 
● S2: Escritura decisiones, auditoría, export, GPC, accesibilidad, i18n. 
● S3: Job Merkle + contrato y anclaje, webhooks firmados, dashboards, hardening. 
● S4: Pruebas e2e, Merkle proofs, DSAR flows, políticas regionales y de edad, 
documentación y runbooks. 
Riesgos & Controles 
● Riesgo: Desalineación legal por región → Control: feature flags en policy_matrix 
por region/age. 
● Riesgo: Servicios consumidores ignoran cambios → Control: “consent‑guard” 
middleware obligatorio y auditorías cruzadas (sondas). 
● Riesgo: PII en logs → Control: redacciones automáticas + linters de logs en CI. 
Script SQL de índices críticos 
