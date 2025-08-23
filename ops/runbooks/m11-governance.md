
# Runbook M11 - Gobernanza Autónoma con Gates Dinámicos

## Objetivo
Implementar un sistema de filtros (gates) dinámicos para restringir la participación en votaciones DAO según criterios configurables (ej: reputación, balance de tokens).

## Pasos
1. Desplegar contratos `ReputationGate`, `TokenBalanceGate`, y `DynamicGovernance`.
2. Añadir gates con `addGate(address)`.
3. Validar elegibilidad de un usuario con `canVote(address)`.

## DoD
- Tests unitarios exitosos en CI.
- Contrato desplegado en red de pruebas.
- Gates configurables dinámicamente.
- Documentación de ejemplo de uso.

## Ejemplo
```bash
npx hardhat run scripts/deploy_m11.ts --network sepolia


/scripts/deploy_m11.ts
```typescript
import { ethers } from "hardhat";

async function main() {
  const Governance = await ethers.getContractFactory("DynamicGovernance");
  const gov = await Governance.deploy();
  console.log("DynamicGovernance desplegado en:", gov.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


