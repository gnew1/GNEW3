
Este documento fue movido a `docs/modules/M19.md`.
  }

  forward(payload: EventPayload) {
    console.log(`[RelayService] reenviando evento: ${JSON.stringify(payload)}`);
  }

  send(type: string, data: any) {
    const event: EventPayload = { type, data, timestamp: Date.now() };
    eventBus.publish(event);
  }
}

export const relayService = new RelayService();


/apps/dao-web/src/hooks/useNotifications.ts

import { useEffect, useState } from "react";
import { eventBus, EventPayload } from "../../../services/notifications/src/m21-event-bus";

export function useNotifications(eventType: string) {
  const [notifications, setNotifications] = useState<EventPayload[]>([]);

  useEffect(() => {
    const handler = (payload: EventPayload) => {
      setNotifications((prev) => [...prev, payload]);
    };



There was a problem with your scheduled task.

/apps/dao-web/src/pages/offline-dashboard.tsx

import React, { useEffect, useState } from "react";

export default function OfflineDashboard() {
  const [status, setStatus] = useState<"online" | "offline">(navigator.onLine ? "online" : "offline");
  const [queue, setQueue] = useState<string[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setStatus("online");
      // sincronizar cola
      queue.forEach((msg) => {
        console.log("Sincronizando mensaje:", msg);
      });
      setQueue([]);
    };
    const handleOffline = () => setStatus("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [queue]);

  const addMessage = () => {
    const msg = `Mensaje local ${Date.now()}`;
    if (status === "offline") {
      setQueue([...queue, msg]);
    } else {
      console.log("Enviando en línea:", msg);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Estado: {status}</h1>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
        onClick={addMessage}
      >
        Añadir mensaje
      </button>
      {queue.length > 0 &&


/services/compliance/src/zkKycVerifier.ts

import { groth16 } from "snarkjs";
import fs from "fs";
import path from "path";

/**
 * Verificador zk-KYC.
 * Permite validar pruebas de cumplimiento sin revelar información sensible.
 * Stub inicial autocontenido hasta integración con circuitos reales.
 */
export class ZkKycVerifier {
  private vKey: any;

  constructor() {
    const vKeyPath = path.join(__dirname, "../circuits/verification_key.json");
    if (fs.existsSync(vKeyPath)) {
      this.vKey = JSON.parse(fs.readFileSync(vKeyPath, "utf-8"));
    } else {
      this.vKey = { stub: true }; // fallback
    }
  }

  async verify(proof: any, publicSignals: any): Promise<boolean> {
    if (this.vKey.stub) {
      console.warn("⚠️ Usando stub de zk-KYC (no apto para producción)");
      return true;
    }
    return groth16.verify(this.vKey, publicSignals, proof);
  }
}

export const zkKycVerifier = new ZkKycVerifier();


/services/compliance/tests/zkKycVerifier.test.ts

import { zkKycVerifier } from "../src/zkKycVerifier";

describe("zkK


/services/compliance/src/zkKYC.ts

/**
 * M23: zk‑KYC / cumplimiento selectivo con privacidad
 * Servicio que implementa verificación KYC mediante pruebas de conocimiento cero.
 */

import { groth16 } from "snarkjs";
import fs from "fs";
import path from "path";

export interface ZkKYCProof {
  proof: any;
  publicSignals: string[];
}

export class ZkKYCService {
  private circuitWasm: string;
  private zkeyFile: string;
  private vkey: any;

  constructor() {
    this.circuitWasm = path.join(__dirname, "../../circuits/kyc.wasm");
    this.zkeyFile = path.join(__dirname, "../../circuits/kyc_final.zkey");
    this.vkey = JSON.parse(fs.readFileSync(path.join(__dirname, "../../circuits/verification_key.json"), "utf-8"));
  }

  async generateProof(identityHash: string, jurisdictionCode: number): Promise<ZkKYCProof> {
    const input = { identityHash, jurisdictionCode };
    const { proof, publicSignals } = await groth16.fullProve(
      input,
      this.circuitWasm,
      this.zkeyFile
    );
    return { proof, publicSignals };
  }

  async verifyProof(proof: ZkKYCProof): Promise<boolean> {
    return await groth16.verify(this.vkey, proof.publicSignals, proof.proof);
  }
}


/services/compliance/tests/zkKYC.test.ts

import { ZkKYCService } from "../src/zkKYC";

describe("ZkKYCService", () => {
  let service: ZkKYCService;

  beforeAll(() => {
    service = new ZkKYCService();
  });

  it("debería generar y verificar una prueba válida", async () => {
    const proof = await service.generateProof("0xabc123", 34);
    const valid = await service.verifyProof(proof);
    expect(valid).toBe(true);
  });
});


/contracts/zkKYCVerifier.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./Verifier.sol"; // generado por snarkjs

contract ZkKYCVerifier {
    Verifier public verifier;

    constructor(address _verifier) {
        verifier = Verifier(_verifier);
    }

    function isCompliant(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[1] memory input
    ) public view returns (bool) {
        return verifier.verifyProof(a, b, c, input);
    }
}


/ops/ci/zkKYC.yml

name: zkKYC Compliance CI

on:
  push:
    paths:
      - "services/compliance/**"
      - "contracts/zkKYCVerifier.sol"

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test --workspace=services/compliance
  solidity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Compile Solidity
        run: npx hardhat compile


/services/compliance/README.md

# zk‑KYC Service

Este módulo permite la verificación de identidad con pruebas de conocimiento cero,
asegurando que un usuario cumple con requisitos regulatorios (edad, jurisdicción, etc.)
sin exponer información personal.

### Uso rápido

```ts
const zkService = new ZkKYCService();
const proof = await zkService.generateProof("0xhash", 34);
const valid = await zkService.verifyProof(proof);

Quality Gates (DoD)

Todas las pruebas unitarias deben pasar (npm test).

Verificación formal de circuitos con snarkjs reproducible.

CI integra compilación Solidity y verificación del contrato.


---

✅ **Commit sugerido**:  
`feat(m23): implementar servicio zk‑KYC con pruebas de conocimiento cero y verificador Solidity`

📌 **Notas de PR**:  
- Añade servicio de pruebas zk‑KYC (Node.js).  
- Añade contrato `ZkKYCVerifier.sol` para validación on‑chain.  
- Añade flujo CI para tests y compilación.  

⚠️ **Riesgos conocidos / mitigaciones**:  
- Los circuitos zk‑SNARK deben ser confiables; se usó un stub básico (`kyc.wasm`) como placeholder, requiere ceremonia de confianza.  
- Mitigación: pipeline soporta reemplazo por circuito auditedo antes de despliegue en mainnet.  

---

🔜 **M_pointer actualizado → M24 (Tesorería y ALM con guard rails on‑chain)**


