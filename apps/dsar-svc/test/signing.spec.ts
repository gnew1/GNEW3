import { signCertificate } from "../src/services/signing"; 
describe("certificate signing", ()=>{ 
beforeAll(()=>process.env.DSAR_CERT_ED25519_PRIV = 
process.env.DSAR_CERT_ED25519_PRIV || `-----BEGIN PRIVATE KEY----- 
MC4CAQAwBQYDK2VwBCIEIGx2Dw9Z3j0aqxJ2p4QXlqQ2c7EPb1wX0sZ2dP6F6nCz -----END PRIVATE KEY-----`); 
it("generates signature and public key", async ()=>{ 
const out = await signCertificate({ a: 1 }); 
expect(out.signature).toBeTruthy(); 
expect(out.publicKey).toContain("BEGIN PUBLIC KEY"); 
}); 
}); 
Playbooks (operativos) 
1. Recepción & verificación 
○ Acuse automático (marca slaAckAt). 
○ Verificación de identidad: preferente DID/Wallet PoP o OTP email. 
○ Estado → verified. 
2. Aprobación & orquestación 
○ Evaluar LegalHold (si existe, bloquear erasure en el sistema afectado, export 
sí). 
○ enqueueTasksFor() genera tareas por conector. 
○ Worker procesa en FIFO con reintentos exponenciales (máx. 5). 
3. Export (access) 
○ Conectores exportData → generan archivos JSON/CSV/PDF. 
○ Manifest con SHA‑256 por archivo y sumario; se adjunta a artefactos. 
○ Entrega segura: link firmado con expiración. 
4. Borrado/Anonimización (erasure) 
○ Estrategia por sistema: delete duro o anonymize columnas. 
○ Evidencias: count_before/after, muestras hasheadas, consultas de 
verificación. 
○ Certificado: JSON firmado (Ed25519) + hash anclado en ConsentAnchor. 
○ Excepciones documentadas (obligación legal, fraude, contabilidad). 
5. Cierre & respuesta 
○ Generar respuesta formal (plantilla multilenguaje) con artefactos y evidencia. 
○ Marcar fulfilled o extended/denied con motivo. 
Métricas & Observabilidad 
● SLA: % cumplido, tiempo medio/percentiles por tipo. 
● Cola: tareas pendientes, retries, tasa de error por conector. 
● Seguridad: sin PII en logs, solo subjectId seudónimo. 
● Trazas: spans en /requests, processTask, exportData/eraseData. 
Controles & Cumplimiento 
● Minimización: solo datos relevantes en export. 
● Retención: artefactos expiran (p. ej., 90 días). 
● LegalHold: bloquea erase por sistema. 
● Pruebas de verificación: endpoint interno que ejecuta queries de “ausencia” 
(zero‑knowledge a futuro si se desea). 
Integración con N130 (consent-svc) 
● DSAR exporta ConsentRecord y ConsentEvent del sujeto. 
● DSAR respeta señales de GPC y withdraw previos (documenta estado en export). 
● Reusa ConsentAnchor para anclar certificado. 
Ejemplos de configuración de conectores 
