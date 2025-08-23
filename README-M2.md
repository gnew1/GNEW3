
# M2: Verificación Formal de Contratos Críticos

## DoD (Definition of Done)
- Contratos críticos con especificaciones formales (CVL, Foundry fuzz).
- CI/CD (GitHub Actions) ejecuta Slither, Echidna, Manticore.
- Quality Gate: merge bloqueado si Slither detecta `high severity` o si Echidna falla una propiedad.
- Reportes archivados como artefactos.

## Ejecución local
```bash
slither contracts/ --checklist
echidna-test contracts/ --config echidna.yaml
forge test

Commit sugerido
feat(security): añadir verificación formal de Governance con Slither, Echidna y CVL specs (M2)

Riesgos conocidos y mitigaciones

Cobertura incompleta de propiedades: mitigar revisando periódicamente el set de invariantes.

Falsos positivos en Slither: mitigación con supresión explícita documentada.

Coste en CI/CD: se ejecuta solo en contratos etiquetados como críticos.


**M_pointer actualizado: M3**


/services/interop/hyperlane-connext-adapter.ts

/**
 * @file Hyperlane/Connext Adapter para GNEW (M3)
 * @description Permite integración de GNEW con bridges cross-chain de terceros
 * @stack Hyperlane SDK, Connext SDK
 */

import { createHypClient } from "@hyperlane-xyz/sdk";
import { ConnextSdkConfig, create as createConnext } from "@connext/sdk";
import { ethers } from "ethers";

export type BridgeProvider = "hyperlane" | "connext";

export interface BridgeMessage {
  destinationChain: string;
  Este documento fue movido a `docs/modules/M2.md`.
  data: string;

  value?: string;

}
