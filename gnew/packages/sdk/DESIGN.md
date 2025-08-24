# GNEW SDK (gnew/packages/sdk) — Diseño

Objetivo: SDK TypeScript para clientes y servicios GNEW.

Módulos principales
- did.ts: resolución/creación DID; firmas y verificación.
- vc.ts: emisión/verificación de VC; derivación selectiva (plan BBS+).
- gasless.ts: helpers AA (sponsor/bundler) y fallback EOA.
- recovery.ts: flujo de recuperación y guardianes.
- reputation.ts / reputation_panel.ts: consulta de reputación y panel.
- badges.ts: emisión/verificación de insignias.
- portability.ts: export/import de datos.
- sybil.ts: detección básica anti-sybil.

Contrato de librería
- import { did, vc, gasless, reputation, recovery } from "@gnew/sdk";
- Todas las funciones puras o con inyección de transport (fetch provider).

Seguridad
- No exponer claves; firmar localmente; inputs validados; redacción de PII.

Observabilidad
- Hooks opcionales para logging/metrics; versión en user-agent.

Configuración
- Endpoints por entorno; timeouts/retries; feature flags.

Edge cases
- Redes caídas; firmas inválidas; falta de sponsor; timeouts.

DoD
- Tipos públicos completos; ejemplos de uso; pruebas de contrato (happy/errores).
