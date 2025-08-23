# GNEW N61 — Mejores prácticas de contratos

**Objetivo:** Estándares de seguridad en todos los smart contracts (SC).

## Entregables
- **Guía de patrones** (abajo) y **plantillas seguras** en `src/templates/`.
- **Librería de utilidades verificada**: `src/utils/` + `src/security/` + `src/errors/Errors.sol`.
- **Configuración de herramientas**: Foundry, Solhint, Slither, cobertura.

## Patrones clave (resumen operativo)
- **Checks-Effects-Interactions**: todas las funciones sensibles siguen CEI (ver `PullPaymentEscrow.withdraw` y `SafeERC20Vault.push`).
- **Errores personalizados**: `Errors.sol` normaliza errores, ahorra gas y mejora DX.
- **Pausa y guardas**: `Guards.sol` integra `Pausable` + `ReentrancyGuard` y un modificador `nonReentrantCEI`.
- **Pull over Push**: pagos con `withdraw()` del usuario (minimiza reentrancia).
- **Propiedad**: `SafeOwnable2Step` evita owner cero y permite handover seguro.
- **UUPS Upgradeable**: ejemplo en `UUPSUpgradeableExample.sol` con `onlyOwner` y `initialize`.

## Pasos (proceso)
1. **Threat modeling**: usa la plantilla en `SECURITY.md` (STRIDE + flujos CEI).
2. **Revisiones de diseño**: checklist de invariantes, roles, límites, pausas.
3. **Implementación con plantillas**: parte de `src/templates/`.
4. **Análisis estático**: `npm run slither`.
5. **Tests diferenciales y fuzz**: `forge test -vvv`.
6. **Cobertura**: `forge coverage`.
7. **Revisión de terceros** (opcional).
8. **Firma y etiquetado** de versión auditada.

## DoD (Definition of Done)
- **Zero** vulnerabilidades High/Critical pendientes (Slither + revisión humana).
- Cobertura mínima 90% en funciones críticas.
- PR con **2 revisores** (Seguridad + Eng. SC).
- **A11y e i18n** no aplican a SC, pero documentación multilenguaje disponible.

## Uso rápido
```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-commit
npm i
npm run build
npm run test
npm run audit:quick


/contracts/SECURITY.md
```md
# Threat Modeling & Checklist

## 1) Contexto
- Roles: owner, operador, usuario.
- Activos: fondos ERC20, permisos, lógica de upgrade.

## 2) Invariantes
- Sumas de saldos no negativas.
- `credits[addr]` solo cambia por depósitos del owner o retiros del propio `addr`.
- Sin pérdida en transferencias (usa `SafeERC20`).

## 3) STRIDE rápido
- **S**poofing: autenticación por roles (owner), `SafeOwnable2Step`.
- **T**ampering: funciones mutables pausable.
- **R**epudiation: eventos `Deposited`, `Withdrawn`, `Pushed`, `Allowed`.
- **I**nformation: no expone secretos; cuidado con eventos y datos.
- **D**enial: `pause()` para incidente; límites `maxPerTx`.
- **E**levation: separación de privilegios; sin selfdestruct.

## 4) Checklist de diseño
- [x] CEI en funciones con transferencias.
- [x] Reentrancy guard en puntos de salida.
- [x] Validación `address(0)` en setters y ctor.
- [x] Errores custom en lugar de `require` con strings.
- [x] Eventos de auditoría de cambios.
- [x] `pause()`/`unpause()` para respuesta a incidentes.
- [x] Límites configurables y tests de límites.
- [x] Código upgradeable usa `initializer` y `_authorizeUpgrade`.

## 5) Tests mínimos (propiedades)
- No se puede retirar más que `credits[msg.sender]`.
- `push` sólo por owner y respeta `maxPerTx`.
- `pull` requiere `allowed[from]` cuando aplique.

