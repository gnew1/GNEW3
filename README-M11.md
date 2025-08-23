
# M11: Gobernanza Autónoma con Gates Dinámicos

## Entregables
- Contrato principal `/contracts/governance/M11DynamicGates.sol`.
- Tests `/tests/governance/test_m11_dynamic_gates.ts`.
- CI `/ops/ci/m11-governance.yml`.
- Runbook `/ops/runbooks/m11-governance.md`.
- Script de despliegue `/scripts/deploy_m11.ts`.

## Commit sugerido


feat(governance): implementar módulo M11 con gates dinámicos de elegibilidad


## Riesgos
- **Complejidad de reglas**: la combinación de múltiples gates puede excluir a demasiados usuarios.
- **Coste de gas**: la iteración por muchos gates aumenta el coste de `canVote`.
- **Mitigación**: optimizar almacenamiento y permitir off-chain simulation.


M_pointer actualizado: M12 ✅

