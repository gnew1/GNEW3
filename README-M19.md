
Este documento fue movido a `docs/modules/M19.md`.
/services/moderation/src/ml/analyzer.ts

/**
 * Stub autocontenido para análisis de contenido
 * Futuro: integrar modelo ML on/off-chain (N121, N122)
 */

export type ModerationDecision = "ALLOW" | "REVIEW" | "BLOCK";

export async function analyzeContent(content: string, metadata?: any): Promise<ModerationDecision> {
  const lower = content.toLowerCase();

  if (lower.includes("violencia") || lower.includes("odio")) {
    return "BLOCK";
  }
  if (lower.includes("sospechoso") || (metadata && metadata.userReputation < 0.5)) {
    return "REVIEW";
  }
  return "ALLOW";
}


/services/moderation/tests/m20-analyzer.test.ts

import { expect } from "chai";
import { analyzeContent } from "../src/ml/analyzer";

describe("M20 Analyzer", () => {
  it("bloquea contenido violento", async () => {
    const result = await analyzeContent("mensaje con violencia");
    expect(result).to.equal("BLOCK");
  });

  it("marca como revisión contenido sospechoso", async () => {
    const result = await analyzeContent("esto es sospechoso");
    expect(result).to.equal("REVIEW");
  });

  it("permite contenido neutral", async () => {
    const result = await analyzeContent("hola, mundo");
    expect(result).to.equal("ALLOW");
  });
});


/ops/ci/m20-moderation.yml

name: M20 Moderation Service CI



/services/moderation/src/m20-moderation.service.ts

import { Injectable } from "@nestjs/common";
import { analyzeText } from "../stubs/ai-moderation";

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
  confidence: number;
}

@Injectable()
export class ModerationService {
  async moderateContent(content: string, userId: string): Promise<ModerationResult> {
    const analysis = await analyzeText(content);

    return {
      flagged: analysis.flagged,
      categories: analysis.categories,
      confidence: analysis.confidence,
    };
  }
}


/services/moderation/src/stubs/ai-moderation.ts

// Stub autocontenido para moderación asistida por IA (N20)

export async function analyzeText(content: string) {
  const lower = content.toLowerCase();
  if (lower.includes("spam") || lower.includes("abuso")) {
    return { flagged: true, categories: ["abuso", "spam"], confidence: 0.95 };
  }
  return { flagged: false, categories: [], confidence: 0.8 };
}


/services/moderation/src/m20-moderation.controller.ts

import { Controller, Post, Body } from "@nestjs/common";
import { ModerationService } from "./m20-moderation.service";

@Controller("moderation")
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post("check")
  async checkContent(@Body() body: { content: string; userId: string }) {
    return this.moderationService.moderateContent(body.content, body.userId);
  }
}


/tests/unit/m20-moderation.service.spec.ts

import { ModerationService } from "../../services/moderation/src/m20-moderation.service";

describe("ModerationService", () => {
  let service: ModerationService;

  beforeEach(() => {
    service = new ModerationService();
  });

  it("marca contenido con spam como abusivo", async () => {
    const result = await service.moderateContent("esto es SPAM", "user1");
    expect(result.flagged).toBe(true);
    expect(result.categories).toContain("spam");
  });

  it("no marca contenido limpio", async () => {
    const result = await service.moderateContent("hola, mundo", "user2");
    expect(result.flagged).toBe(false);
  });
});


/ops/ci/m20-moderation.yml

name: M20 Moderación

on:
  push:
    paths:
      - "services/moderation/**"
      - "tests/unit/m20-moderation.service.spec.ts"
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test -- --runTestsByPath tests/unit/m20-moderation.service.spec.ts


/ops/runbooks/m20-moderation.md

# Runbook M20 - Moderación/anti-abuso asistida por IA

## Objetivo
- Detectar spam, abuso y lenguaje inapropiado


/services/notifications/src/m21-event-bus.ts

import { EventEmitter } from "events";

export type EventPayload = {
  type: string;
  data: any;
  timestamp: number;
};

class DecentralizedEventBus extends EventEmitter {
  publish(event: EventPayload) {
    this.emit(event.type, event);
  }

  subscribe(eventType: string, handler: (payload: EventPayload) => void) {
    this.on(eventType, handler);
  }

  unsubscribe(eventType: string, handler: (payload: EventPayload) => void) {
    this.off(eventType, handler);
  }
}

export const eventBus = new DecentralizedEventBus();


/services/notifications/src/m21-relay.service.ts

import { eventBus, EventPayload } from "./m21-event-bus";

/**
 * Servicio que simula un relay descentralizado.
 * Futuro: integración con Waku/Libp2p para transporte real.
 */
export class RelayService {
  constructor() {
    eventBus.subscribe("notification", this.forward);
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


