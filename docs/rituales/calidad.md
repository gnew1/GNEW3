# Rituales de Calidad GNEW 
 
1. **Retrospectiva (Retro):** 
   - Revisión de métricas DORA cada 2 semanas. 
   - Identificación de cuellos de botella en despliegues, bugs o 
tiempos de entrega. 
 
2. **Tech Debt Day (cada 6 semanas):** - 1 día completo dedicado a: - Refactor de componentes duplicados. - Eliminación de código obsoleto. - Mejoras de accesibilidad y cobertura de tests. 
3. **Métrica clave DoD:** - Tendencia positiva en DORA en 2 de 4 métricas cada trimestre. - Deuda técnica en SonarQube ≤ 15% del código. 
✅
 Definition of Done (DoD): 
● Panel QualityDashboard accesible desde /quality. 
● Workflow quality.yml pasando en main. 
● Métricas DORA recolectadas y visibles. 
● Documentación de rituales publicada. 
¿Quieres que prepare también un script automatizado que recoja las métricas DORA reales 
desde GitHub Actions (builds, despliegues, fallos) en lugar de mockearlas en el endpoint 
Express? 
Tú dijiste: 
programa a nivel de detalle y entrega para GNEW N101 11.1 Tesorería multisig y políticas 
(Prompt 101) Objetivo: Operar tesorería en multisig con políticas por importe, rol y horario. 
Roles: Finanzas DAO (lead), Eng. SC, Seguridad. Stack: Gnosis Safe (o Safe{Core}) + 
módulos; Policy-as-code (OPA). Entregables: Safe configurado, reglas OPA versionadas, 
runbook. Pasos: crear safes por “fondos” (operativo, grants, R&D); definir owners y umbrales 
por riesgo; OPA evalúa límites. DoD: transacciones >X requieren N firmas y pasan políticas; 
auditoría on-chain/off-chain. Riesgos & Controles: pérdida de quorum → guardian de 
emergencia + rotación. 
ChatGPT Plus 
Pensó durante 49s 
¡Vamos! Aquí tienes la entrega completa de N101 11.1 Tesorería multisig y políticas para 
GNEW, lista para integrar en el monorepo. Empiezo con la ruta completa de cada archivo y a 
continuación el programa (código y configs) tal como pides. 
 
