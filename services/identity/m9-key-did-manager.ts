
/**
 * M9: Gestión Avanzada de Claves y DIDs
 * Implementación básica de DID Document Manager con soporte MPC/TSS (stub),
 * WebAuthn y compatibilidad HSM/KMS (simulado).
 */

import * as crypto from "crypto";
import { Request, Response } from "express";
import express from "express";

export interface DIDDocument {
  id: string;
  publicKey: string;
  authentication: string[];
  created: string;
  updated: string;
}

class MPCStub {
  static generateKey(): string {
    // Stub MPC/TSS
    return crypto.createECDH("secp256k1").generateKeys("hex", "compressed");
  }
}

export class DIDManager {
  private docs: Map<string, DIDDocument> = new Map();

  createDID(): DIDDocument {
    const pubKey = MPCStub.generateKey();
    const id = `did:gnew:${crypto.randomBytes(8).toString("hex")}`;
    const doc: DIDDocument = {
      id,
      publicKey: pubKey,
      authentication: [`${id}#keys-1`],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    this.docs.set(id, doc);
    return doc;
  }

  getDID(id: string): DIDDocument | undefined {
    return this.docs.get(id);
  }

  bindDevice(id: string, deviceId: string): DIDDocument | undefined {
    const doc = this.docs.get(id);
    if (!doc) return undefined;
    doc.authentication.push(`device:${deviceId}`);
    doc.updated = new Date().toISOString();
    return doc;
  }
}

const manager = new DIDManager();
const app = express();
app.use(express.json());

// Endpoints
app.post("/dids", (_: Request, res: Response) => {
  const doc = manager.createDID();
  res.json(doc);
});

app.get("/dids/:id", (req: Request, res: Response) => {
  const doc = manager.getDID(req.params.id);
  if (!doc) return res.status(404).json({ error: "DID no encontrado" });
  res.json(doc);
});

app.post("/dids/:id/bind", (req: Request, res: Response) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId requerido" });
  const doc = manager.bindDevice(req.params.id, deviceId);
  if (!doc) return res.status(404).json({ error: "DID no encontrado" });
  res.json(doc);
});

if (require.main === module) {
  const port = process.env.PORT || 4009;
  app.listen(port, () =>
    console.log(`M9 Key & DID Manager corriendo en puerto ${port}`)
  );
}


