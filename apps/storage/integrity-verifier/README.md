
# Integrity Verifier — Firmas y Merkle Proofs (N162)

> **Objetivo (Prompt N162)**: **Verificación reproducible** de artefactos mediante **hashes**, **firmas** (Ed25519 / RSA‑PSS / ECDSA) y **Merkle proofs** (inclusión).  
> **Stack**: Node 20+, TypeScript 5, Express, SQLite (WAL), `crypto` nativo, pnpm.  
> **Entregables**: servicio `POST /verify` y **CLI** `gnew-verify`.  
> **DoD**: validación reproducible, auditoría append-only, **alertas** ante mismatch (respuesta con `ok=false` y detalle de fallos).

## Endpoints

- `POST /verify`  
  Cuerpo:
  ```jsonc
  {
    "source": {                        // de dónde sale el artefacto
      "type": "base64|hex|url",
      "data": "....",                  // base64 o hex cuando aplica
      "url": "https://..."             // si type=url
    },
    "hash": {                          // verificación de hash (opcional pero recomendado)
      "algo": "sha256|sha3-256",
      "expectedHex": "ab12..."
    },
    "signature": {                     // verificación de firma (opcional)
      "scheme": "ed25519|rsa-pss-sha256|ecdsa-p256-sha256|ecdsa-secp256k1-sha256",
      "publicKeyPem": "-----BEGIN PUBLIC KEY----- ...",
      "signatureBase64": "MEUCIQ...",  // firma detached sobre el **artefacto**
      "over": "artifact|hash",         // por defecto: artifact
      "hashAlgo": "sha256|sha3-256"    // si over=hash
    },
    "merkle": {                        // prueba de inclusión (opcional)
      "hashAlgo": "sha256|sha3-256",
      "rootHex": "aa..",
      "leafHex": "bb..",               // opcional; si no se pasa se calcula hash(artifact)
      "proof": [                       // ruta de prueba
        { "position": "left|right", "hashHex": "cc.." }
      ]
    },
    "labels": { "artifactId": "build-2025-08-20", "context": "release" } // metadatos opcionales
  }


Respuesta:

{
  "ok": true,
  "checks": {
    "hash": { "ok": true, "computedHex": "...", "expectedHex": "..." },
    "signature": { "ok": true, "scheme": "ed25519" },
    "merkle": { "ok": true, "leafHex": "...", "rootHex": "..." }
  },
  "artifact": { "size": 12345, "sha256Hex": "...", "sha3_256Hex": "..." },
  "mismatch": []
}


GET /healthz — estado.

GET /audit/:id — cadena de auditoría del verificationId.

CLI

gnew-verify acepta un spec JSON como el cuerpo de /verify:

# desde el monorepo
pnpm -C apps/storage/integrity-verifier build
node apps/storage/integrity-verifier/dist/cli/gnew-verify.js --spec ./spec.json
# ó por flags simples:
node apps/storage/integrity-verifier/dist/cli/gnew-verify.js --file ./artifact.bin --hash sha256:ABCD... \
  --pub ./pub.pem --sig ./artifact.bin.sig --scheme ed25519


Salida (exit code ≠0 si falla):

{ "ok": false, "mismatch": ["hash","signature"], "checks": { ... } }

Ejecución
pnpm i
pnpm -C apps/storage/integrity-verifier build
pnpm -C apps/storage/integrity-verifier start

Notas

Soporta sha256 y sha3‑256 para hashing y Merkle.

Firmas detached sobre artefacto o sobre el hash (configurable con signature.over).

Auditoría encadenada por hash para cada verificación (payload completo y resultado).


/apps/storage/integrity-verifier/package.json
```json
{
  "name": "@gnew/integrity-verifier",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "gnew-verify": "dist/cli/gnew-verify.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand"
  },
  "dependencies": {
    "better-sqlite3": "^9.6.0",
    "express": "^4.19.2",
    "nanoid": "^5.0.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^22.5.4",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.4",
    "typescript": "^5.5.4"
  }
}


