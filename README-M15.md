
# M15: Telemetría end-to-end y correlación on/off-chain

## Entregables
- Collector `/services/telemetry/collector.ts`
- Hook `/apps/dao-web/hooks/useTelemetry.ts`
- API `/apps/dao-web/pages/api/telemetry.ts`
- Tests `/tests/telemetry/test_m15.spec.ts`
- CI `/ops/ci/m15-telemetry.yml`
- Runbook `/ops/runbooks/m15-telemetry.md`

## Commit sugerido


feat(telemetry): agregar correlación end-to-end de eventos on/off-chain


## Riesgos
- **Privacidad**: datos sensibles podrían filtrarse. → Mitigación: anonimización de campos.
- **Rendimiento**: escribir en disco puede degradar. → Mitigación: batching y colas.


M_pointer actualizado: M16 ✅

