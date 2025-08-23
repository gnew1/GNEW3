# Parámetros confiables (Trusted Setup) y Ceremony

## Opciones
- **Groth16 (Circom)**: requiere Powers of Tau (PTAU) + zkey por circuito.
- **Plonk/UltraPlonk (Noir)**: SRS universal (p. ej., 2^k) → menos fricción.

## Recomendación GNEW
- Fase 1 (universal): **Powers of Tau** comunitario (MPC) → publicar transcripciones y hashes.
- Fase 2 (por circuito): zkey por `vote` y `range`.
- **Rotación**: si se sospecha toxic waste, generar nuevo SRS y zkeys, versionar verificador on chain.

## Comandos (demo local)
```bash
# 1) Compilar circuitos
npm -w @gnew/zk-circom run build
npm -w @gnew/zk-circom run compile:vote
npm -w @gnew/zk-circom run compile:range

# 2) Powers of Tau (MPC local de ejemplo, no usar en prod)
npm -w @gnew/zk-circom run ptau:small

# 3) zkeys y verifiers (Groth16)
npm -w @gnew/zk-circom run zkey:vote && npm -w @gnew/zk-circom run export:sol:vote
npm -w @gnew/zk-circom run zkey:range && npm -w @gnew/zk-circom run export:sol:range

# 4) Deploy de verificadores y contratos de aplicación
# (usar foundry/hardhat scripts según pipelines del monorepo)

Riesgos & Controles
●	Toxic waste: usar MPC con múltiples participantes, grabar contribuciones con transcript firmado.

●	Rotación de VK/SRS: contratos de aplicación deben poder actualizar la dirección del verificador (proxy o setter con timelock).

●	Auditoría: revisar circuitos (constraints esperadas), forzar tests negativos (proof inválida).

●	Gas: preferir Groth16 para EVM pública; Plonk vía L2/Rollups donde gas/VM lo permita.

DoD
●	Verificación correcta (tests positivos/negativos).

●	Tiempos aceptables: generación off chain < N s (dev), verificación on chain < ~300k gas/voto (Groth16 típico).

●	Reporte de gas en CI.


/contracts/scripts/zk/DeployBallotZK.s.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/zk/BallotZK.sol";
import "../../src/zk/verifiers/MockGroth16Verifier.sol";

contract DeployBallotZK is Script {
    function run() external {
        vm.startBroadcast();
        // Sustituir por verificador real exportado desde snarkjs
        MockGroth16Verifier v = new MockGroth16Verifier(true);
        BallotZK ballot = new BallotZK(v, bytes32(uint256(123)), 4);
        console2.log("Verifier:", address(v));
        console2.log("BallotZK:", address(ballot));
        vm.stopBroadcast();
    }
}

