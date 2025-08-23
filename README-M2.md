
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
  recipient: string;
  data: string;
  value?: string;
}

export class BridgeAdapter {
  private hypClient: any;
  private connextClient: any;

  constructor() {}

  async init() {
    this.hypClient = await createHypClient();
    this.connextClient = await createConnext({
      signerAddress: process.env.BRIDGE_SIGNER!,
      network: "testnet",
    } as ConnextSdkConfig);
  }

  async sendMessage(provider: BridgeProvider, msg: BridgeMessage): Promise<string> {
    if (provider === "hyperlane") {
      const tx = await this.hypClient.sendMessage({
        destination: msg.destinationChain,
        recipient: msg.recipient,
        message: msg.data,
      });
      return tx.hash;
    }
    if (provider === "connext") {
      const tx = await this.connextClient.xcall({
        destination: msg.destinationChain,
        to: msg.recipient,
        callData: msg.data,
        value: msg.value || "0",
      });
      return tx.transactionHash;
    }
    throw new Error("Proveedor de bridge no soportado");
  }
}


/contracts/BridgeReceiver.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BridgeReceiver
/// @notice Contrato receptor de mensajes cross-chain de Hyperlane/Connext
contract BridgeReceiver {
    event MessageReceived(address indexed from, string origin, bytes data);

    function handleMessage(address from, string calldata origin, bytes calldata data) external {
        emit MessageReceived(from, origin, data);
        // Integración con lógica DAO (ej.: ejecutar voto remoto)
    }
}


/tests/interop/bridgeAdapter.test.ts

import { BridgeAdapter } from "../../services/interop/hyperlane-connext-adapter";

describe("BridgeAdapter", () => {
  let adapter: BridgeAdapter;

  beforeAll(async () => {
    adapter = new BridgeAdapter();
    await adapter.init();
  });

  it("lanza error si se usa proveedor desconocido", async () => {
    await expect(
      adapter.sendMessage("foo" as any, {
        destinationChain: "testnet",
        recipient: "0x123",
        data: "0x",
      })
    ).rejects.toThrow("Proveedor de bridge no soportado");
  });
});


/ops/ci/m3-interop.yml

name: M3 Interoperabilidad

on:
  pull_request:
    paths:
      - "services/interop/**"
      - "contracts/BridgeReceiver.sol"

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test -- --runTestsByPath tests/interop/bridgeAdapter.test.ts
      - name: Compilar contratos
        run: npx hardhat compile


/examples/m3-usage.ts

import { BridgeAdapter } from "../services/interop/hyperlane-connext-adapter";

async function main() {
  const adapter = new BridgeAdapter();
  await adapter.init();

  const txHash = await adapter.sendMessage("hyperlane", {
    destinationChain: "ethereum-sepolia",
    recipient: "0xabc123...",
    data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("Hello GNEW")),
  });

  console.log("Mensaje enviado, txHash:", txHash);
}

main().catch(console.error);


/README-M3.md

# M3: Integración de Bridge Cross-Chain de Terceros

## DoD
- Envío y recepción de mensajes entre testnets con Hyperlane/Connext.
- Contrato receptor (`BridgeReceiver.sol`) desplegable.
- PoC con pruebas unitarias incluidas.
- CI/CD con quality gate en PRs que modifiquen interop.

## Ejecución
```bash
npm test -- --runTestsByPath tests/interop/bridgeAdapter.test.ts
npx hardhat compile
ts-node examples/m3-usage.ts

Commit sugerido
feat(interop): integrar bridges de terceros (Hyperlane/Connext) con PoC receptor on-chain (M3)

Riesgos y mitigaciones

Riesgo: dependencias externas de seguridad variable.

Mitigación: revisión periódica de auditorías de Hyperlane/Connext.

Riesgo: latencia y costos variables entre redes.

Mitigación: benchmarking comparativo en entornos de prueba.


**M_pointer actualizado: M4**


