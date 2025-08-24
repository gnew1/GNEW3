# GnewRulesPaymaster — Diseño

Objetivo: Paymaster ERC-4337 con políticas de egresos.

Reglas
- Allowlist de contratos/métodos; caps por acción; límites de gas e importe.

Interfaces
- setRule(selector, caps): onlyOwner
- validatePaymasterUserOp(op): returns context or revert

Datos
- Mapping (selector=>Rule). Versionado y pausas.

Seguridad
- Pausable, Ownable, reentrancy guard, verificación firmas.

Observabilidad
- Eventos: RuleSet, RuleHit, RuleReject, Paused.

Edge cases
- Lotes grandes, gas price spikes, op malformado.

DoD
- Pruebas: allow/deny, límites, pausa. Fuzz de selectors.
