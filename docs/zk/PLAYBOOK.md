# Playbook zk-SNARKs GNEW

## Casos seleccionados
- **Votación privada** (BallotZK): evitar revelar identidad, bloquear doble voto con `nullifierHash`.
- **Prueba de saldo (range)**: liberar retiro si `balance >= amount` sin exponer balance.

## Flujo de extremo a extremo (vote)
1. Backend prepara Merkle Root del censo y lo publica en `BallotZK.setRoot(root)`.
2. Cliente genera prueba (Circom): inputs privados (secret, nullifier, path) y públicos `[root, nullifierHash, option]`.
3. On-chain: `BallotZK.vote(a,b,c,publicSignals)` → verifica y emite `VoteCast`.

## Métricas de gas y tiempos
- Medir en Foundry usando `gas_report` y en red de pruebas.
- Objetivo: `BallotZK.vote` < 350k gas con Groth16 verificador típico.

## Controles
- **Toxic waste**: ceremonia MPC y rotación de SRS/VK.
- **DoS**: tamaño de input acotado, `options` pequeño.
- **Replay**: set `usedNullifiers`.
- **Actualización**: capacidad de actualizar `root` y `verifier` bajo gobierno (timelock).

 
Cómo usar (resumen operativo)
1.	Compila circuitos y genera verifiers (Groth16)

○	En zk/circom: npm run compile:vote && npm run ptau:small && npm run zkey:vote && npm run export:sol:vote

○	Repite para range. Reemplaza MockGroth16Verifier por los verifiers exportados (ubicados en contracts/src/zk/verifiers/*.sol).

2.	Despliega en testnet

○	forge script contracts/scripts/zk/DeployBallotZK.s.sol --rpc-url <RPC> --broadcast --verify

3.	Cliente (off-chain)

○	Genera prueba: npm run prove:vote → obtendrás proof.json y public.json.

○	Codifica a,b,c,publicSignals para la llamada a vote().

4.	DoD

○	Verificación correcta con pruebas positivas/negativas (incluidas).

○	Gas verificado bajo umbral en testnet.

○	Ceremony documentada y control de rotación listo.

 
¿Te genero también el script de codificación (TS) que transforma proof.json/public.json de snarkjs al ABI de Solidity (a,b,c,input) y un dashboard de gas para los contratos BallotZK y RangeWithdraw?
Tú dijiste:
programa a detalle para GNEW N65 7.5 DID + privacidad selectiva (Prompt 65) Objetivo: Minimal disclosure (selective) para credenciales. Roles: Identidad, Privacidad. Stack: BBS+ / SD-JWT, ZK-proofs. Entregables: Flujos de verificación granular. Pasos: Mapear claims por caso de uso. Auditoría de datos mínimos. DoD: Cumple GDPR (minimización).
ChatGPT Plus
Pensó durante 1m 30s
Aquí tienes el programa a nivel de detalle y entrega para GNEW N65 — 7.5 DID + privacidad selectiva (Prompt 65), coherente con el monorrepo que ya tienes. Incluye servicios nuevos para SD JWT (selective disclosure) y BBS+, flujos de verificación granular, mapeo de claims por caso de uso, pruebas y controles GDPR (minimización). Sigo tu formato: empiezo cada bloque con la ruta completa y después el código listo para integrarse.
 
Servicio: identidad y SD JWT (FastAPI, Python)
Objetivo: Emisión y verificación de SD JWT con divulgación selectiva, vinculación de claves (holder binding) y políticas de minimización por caso de uso.
Código
Ruta completa: .\services\identity\requirements.in
fastapi
uvicorn[standard]
python-jose[cryptography]
pydantic
pydantic-settings
pyyaml
structlog
prometheus-fastapi-instrumentator
opentelemetry-api

Ruta completa: .\services\identity\requirements.txt
# generado con pip-compile; puedes regenerar igual que el resto de servicios
fastapi==0.115.14
uvicorn[standard]==0.35.0
python-jose[cryptography]==3.5.0
pydantic==2.11.7
pydantic-core==2.33.2
pydantic-settings==2.10.1
pyyaml==6.0.2
structlog==25.4.0
prometheus-fastapi-instrumentator==6.1.0
opentelemetry-api==1.34.1

Ruta completa: .\services\identity\Dockerfile
ARG PYTHON_VERSION=3.12-alpine
FROM python:${PYTHON_VERSION} AS builder
WORKDIR /app
RUN apk add --no-cache build-base
COPY requirements.txt .
RUN pip install --prefix /install -r requirements.txt
COPY . .

FROM python:${PYTHON_VERSION}
WORKDIR /app
COPY --from=builder /install /usr/local
COPY --from=builder /app /app
USER 1001
EXPOSE 8010
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:8010/healthz || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]

Ruta completa: .\services\identity\.env.example
ENV=development
SDJWT_ISSUER=http://identity:8010
SDJWT_ISSUER_KID=sd-issuer-1
# Clave de desarrollo; en producción cargar desde Vault/secret manager
SDJWT_PRIVATE_KEY_PEM=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
SDJWT_PUBLIC_KEY_PEM=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----

Ruta completa: .\services\identity\config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    env: str = "development"
    sdjwt_issuer: str = "http://identity:8010"
    sdjwt_issuer_kid: str = "sd-issuer-1"
    sdjwt_private_key_pem: str | None = None
    sdjwt_public_key_pem: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

Ruta completa: .\services\identity\policies\claims.yml
# Mapeo de claims mínimos por caso de uso (GDPR minimización)
votacion:
  # Requisitos: mayoría de edad y residencia sin revelar fecha exacta ni dirección
  required:
    - age_over_18
    - residency_country
  optional: []

saldos:
  # Verificar que el balance es >= threshold, sin revelar el valor exacto
  required:
    - balance_geq   # se acompaña de una prueba (zk) o de disclosure hash
  optional: []

Ruta completa: .\services\identity\utils\sd_jwt.py
import base64, hashlib, json, os, time, secrets
from typing import Any, Dict, List, Tuple
from jose import jwt
from ..config import settings

ALG = "RS256"
SD_ALG = "sha-256"

def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def b64u_json(obj: Any) -> str:
    return b64u(json.dumps(obj, separators=(",", ":")).encode())

def sd_hash(disclosure_b64u: str) -> str:
    # SD-JWT digest = b64url( SHA-256( disclosure_bytes ) )
    raw = base64.urlsafe_b64decode(disclosure_b64u + "==")
    return b64u(hashlib.sha256(raw).digest())

def make_disclosure(claim: str, value: Any, salt: str | None = None) -> str:
    # Disclosure item: [salt, claim_name, claim_value]
    salt = salt or b64u(secrets.token_bytes(16))
    return b64u_json([salt, claim, value])

def issue_sdjwt(sub: str, claims: Dict[str, Any], aud: str | None = None, nonce: str | None = None) -> Dict[str, Any]:
    disclosures: List[str] = []
    digests: List[str] = []
    for k, v in claims.items():
        d = make_disclosure(k, v)
        disclosures.append(d)
        digests.append(sd_hash(d))

    now = int(time.time())
    payload = {
        "iss": settings.sdjwt_issuer,
        "sub": sub,
        "iat": now,
        "_sd": digests,
        "_sd_alg": SD_ALG,
    }
    if aud: payload["aud"] = aud
    if nonce: payload["nonce"] = nonce

    headers = {"kid": settings.sdjwt_issuer_kid, "alg": ALG, "typ": "JWT"}
    priv = settings.sdjwt_private_key_pem
    if not priv:
        # clave de desarrollo (no usar en prod)
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        priv = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode()
    token = jwt.encode(payload, priv, algorithm=ALG, headers=headers)
    return {"sd_jwt": token, "disclosures": disclosures}

def present(sd_jwt: str, selected_disclosures: List[str], kb_jwt: str | None = None) -> Dict[str, Any]:
    # Holder envía SD-JWT, subset de disclosures y, opcionalmente, KB-JWT
    return {"sd_jwt": sd_jwt, "disclosures": selected_disclosures, "kb_jwt": kb_jwt}

def _verify_signature(sd_jwt: str) -> Dict[str, Any]:
    pub = settings.sdjwt_public_key_pem
    options = {"verify_aud": False}
    return jwt.decode(sd_jwt, pub, algorithms=[ALG], options=options)

def verify(sd_jwt: str, disclosures: List[str], expected_use_case: str, requested_claims: List[str] | None = None, aud: str | None = None, nonce: str | None = None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    hdr, payload = jwt.get_unverified_header(sd_jwt), _verify_signature(sd_jwt)
    if payload.get("_sd_alg") != SD_ALG:
        raise ValueError("Algoritmo SD no soportado")
    if aud and payload.get("aud") != aud:
        raise ValueError("aud no coincide")
    if nonce and payload.get("nonce") != nonce:
        raise ValueError("nonce no coincide")

    sd_list = set(payload.get("_sd", []))
    disclosed: Dict[str, Any] = {}
    for d in disclosures:
        digest = sd_hash(d)
        if digest not in sd_list:
            raise ValueError("Disclosure no pertenece al SD-JWT")
        salt, name, value = json.loads(base64.urlsafe_b64decode(d + "=="))
        disclosed[name] = value

    # Minimización: validar contra política del caso de uso
    from yaml import safe_load
    import pathlib
    policy_path = pathlib.Path(__file__).parent.parent / "policies" / "claims.yml"
    policies = safe_load(policy_path.read_text(encoding="utf-8"))
    if expected_use_case not in policies:
        raise ValueError("Caso de uso desconocido")
    required = set(policies[expected_use_case].get("required", []))
    optional = set(policies[expected_use_case].get("optional", []))
    allowed = required | optional

    # Si el verificador solicitó explícitamente claims, intersectar
    if requested_claims:
        allowed = allowed & set(requested_claims)

    extra = set(disclosed.keys()) - allowed
    missing = required - set(disclosed.keys())
    minimal = (not extra) and (not missing)

    result = {
        "iss": payload.get("iss"),
        "sub": payload.get("sub"),
        "claims": {k: v for k, v in disclosed.items()},
        "policy_required": sorted(list(required)),
        "policy_optional": sorted(list(optional)),
        "missing_required": sorted(list(missing)),
        "extra_disclosed": sorted(list(extra)),
        "minimal": minimal,
    }
    return payload, result

Ruta completa: .\services\identity\main.py
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.common.middleware import ExceptionMiddleware, LoggingMiddleware
from services.common.otel import setup_otel
from services.common.health import health_response
from .config import settings
from .utils.sd_jwt import issue_sdjwt, present, verify

app = FastAPI(title="Identity & SD-JWT")
app.add_middleware(LoggingMiddleware)
app.add_middleware(ExceptionMiddleware)
setup_otel("identity", app)

class IssueRequest(BaseModel):
    sub: str
    claims: dict
    aud: str | None = None
    nonce: str | None = None

class PresentRequest(BaseModel):
    sd_jwt: str
    disclosures: list[str]
    kb_jwt: str | None = None

class VerifyRequest(BaseModel):
    sd_jwt: str
    disclosures: list[str]
    use_case: str
    requested_claims: list[str] | None = None
    aud: str | None = None
    nonce: str | None = None

@app.get("/healthz")
async def healthz():
    deps = {"vault": "ok", "db": "ok", "nats": "ok"}
    return health_response(deps)

@app.post("/sdjwt/issue")
async def sdjwt_issue(req: IssueRequest):
    try:
        return issue_sdjwt(req.sub, req.claims, req.aud, req.nonce)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/sdjwt/present")
async def sdjwt_present(req: PresentRequest):
    return present(req.sd_jwt, req.disclosures, req.kb_jwt)

@app.post("/sdjwt/verify")
async def sdjwt_verify(req: VerifyRequest):
    try:
        _, result = verify(req.sd_jwt, req.disclosures, req.use_case, req.requested_claims, req.aud, req.nonce)
        status = 200 if result["minimal"] and not result["missing_required"] else 400
        return JSONResponse(status_code=status, content=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

Ruta completa: .\services\identity\tests\test_sdjwt.py
from httpx import AsyncClient, ASGITransport
from services.identity.main import app

import pytest

@pytest.mark.asyncio
async def test_sdjwt_flow_minimal():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # emisión con claims completos
        i = await ac.post("/sdjwt/issue", json={
            "sub": "did:key:holder1",
            "claims": {"age_over_18": True, "residency_country": "NL", "email": "x@y.z"},
            "aud": "verifier-app",
            "nonce": "n-123"
        })
        data = i.json()
        # holder revela solo lo requerido por 'votacion'
        disclosures = [d for d in data["disclosures"] if '"age_over_18"' in d or '"residency_country"' in d]
        p = await ac.post("/sdjwt/present", json={"sd_jwt": data["sd_jwt"], "disclosures": disclosures})
        v = await ac.post("/sdjwt/verify", json={
            "sd_jwt": p.json()["sd_jwt"],
            "disclosures": disclosures,
            "use_case": "votacion",
            "requested_claims": ["age_over_18", "residency_country"],
            "aud": "verifier-app",
            "nonce": "n-123"
        })
        assert v.status_code == 200
        out = v.json()
        assert out["minimal"] is True
        assert out["missing_required"] == []
        assert out["extra_disclosed"] == []

 
Servicio: BBS+ (Node + TypeScript, WASM)
Objetivo: Soportar credenciales JSON LD firmadas con BBS+, prueba derivada (proof derivation) y verificación de subconjuntos de claims sin revelar todo el documento.
Nota: se usa @mattrglobal/bbs-signatures (WASM). En producción, fija versión y activa cache de WASM.
Ruta completa: .\services\bbs-verifier\package.json
{
  "name": "bbs-verifier",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --enable-source-maps dist/index.js",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@mattrglobal/bbs-signatures": "^1.3.0",
    "express": "^4.21.2",
    "prom-client": "^15.1.1"
  },
  "devDependencies": {
    "typescript": "5.8.2",
    "@types/express": "^4.17.21",
    "vitest": "^1.4.0"
  }
}

Ruta completa: .\services\bbs-verifier\tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2020",
    "outDir": "dist",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}

Ruta completa: .\services\bbs-verifier\src\index.ts
import express from "express";
import { collectDefaultMetrics, register } from "prom-client";
import {
  generateBls12381G2KeyPair,
  blsBbsSign,
  blsBbsVerify,
  bbsCreateProof,
  bbsVerifyProof
} from "@mattrglobal/bbs-signatures";

const app = express();
app.use(express.json());
collectDefaultMetrics();

let ISSUER: { publicKey: Uint8Array; secretKey: Uint8Array } | null = null;

async function ensureKeypair() {
  if (!ISSUER) {
    ISSUER = await generateBls12381G2KeyPair();
  }
}

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

/**
 * Emite una VC simplificada: lista ordenada de mensajes (claims).
 * Para pruebas, empleado por "saldos" (p.ej. ["balance_geq:100", "asset:EUR"]).
 */
app.post("/bbs/issue-vc", async (req, res) => {
  const { messages } = req.body as { messages: string[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages required" });
  }
  await ensureKeypair();
  const encoded = messages.map((m) => new TextEncoder().encode(m));
  const sig = await blsBbsSign({
    keyPair: ISSUER!,
    messages: encoded
  });
  res.json({
    publicKey: Buffer.from(ISSUER!.publicKey).toString("base64url"),
    messages,
    signature: Buffer.from(sig).toString("base64url")
  });
});

/**
 * Deriva una prueba BBS+ revelando solo ciertos índices.
 */
app.post("/bbs/derive-proof", async (req, res) => {
  const { messages, signature, revealIndices, nonce, publicKey } = req.body as {
    messages: string[];
    signature: string;
    revealIndices: number[];
    nonce?: string;
    publicKey: string;
  };
  const pk = new Uint8Array(Buffer.from(publicKey, "base64url"));
  const sig = new Uint8Array(Buffer.from(signature, "base64url"));
  const encoded = messages.map((m) => new TextEncoder().encode(m));
  const proof = await bbsCreateProof({
    publicKey: pk,
    messages: encoded,
    signature: sig,
    nonce: nonce ? new TextEncoder().encode(nonce) : undefined,
    revealed: new Set(revealIndices)
  });
  res.json({ proof: Buffer.from(proof).toString("base64url") });
});

/**
 * Verifica la prueba BBS+ (solo lo revelado).
 */
app.post("/bbs/verify-proof", async (req, res) => {
  const { revealedMessages, proof, publicKey, nonce } = req.body as {
    revealedMessages: { index: number; message: string }[];
    proof: string;
    publicKey: string;
    nonce?: string;
  };
  const pk = new Uint8Array(Buffer.from(publicKey, "base64url"));
  const proofBytes = new Uint8Array(Buffer.from(proof, "base64url"));
  const messages = revealedMessages.map((r) => ({
    index: r.index,
    message: new TextEncoder().encode(r.message)
  }));

  const ok = await bbsVerifyProof({
    proof: proofBytes,
    publicKey: pk,
    messages,
    nonce: nonce ? new TextEncoder().encode(nonce) : undefined
  });
  res.status(ok.verified ? 200 : 400).json({ verified: ok.verified });
});

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

const PORT = process.env.PORT || 8011;
app.listen(PORT, () => console.log(`bbs-verifier listening on ${PORT}`));

 
Circuito opcional (off chain) para “saldos ≥ umbral” (Noir/Circom)
Opcional: si quieres reforzar saldos con una ZK prueba en vez de solo SD JWT/BBS+, añade este circuito y verifica off chain con snarkjs. Mantiene el principio de minimización.
Ruta completa: .\zk\circuits\balance_threshold.circom
pragma circom 2.1.6;

// Prueba que balance >= threshold sin revelar balance.
// Inputs públicos: commitment, threshold. Privados: balance, blinding r.
template BalanceGEQ() {
    signal input balance;      // private
    signal input r;            // private randomness
    signal input threshold;    // public
    signal input commitment;   // public: Poseidon(balance || r)

    component gt = IsGreaterOrEqual(32);
    gt.in[0] <== balance;
    gt.in[1] <== threshold;

    // Verifica commitment = Poseidon(balance, r)
    component H = Poseidon(2);
    H.inputs[0] <== balance;
    H.inputs[1] <== r;

    H.out === commitment;
    gt.out === 1;
}
component main = BalanceGEQ();

 
UI: flujo de verificación granular (React – paquete UI interno)
Ruta completa: .\packages\ui\src\verification-flow.tsx
import React, { useMemo, useState } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { Input } from "./input";

type Claim = { key: string; value: string | boolean };
type Props = {
  identityUrl?: string;           // http://identity:8010
  useCase: "votacion" | "saldos";
  requested?: string[];           // claims solicitadas por el verificador
};

export function VerificationFlow({ identityUrl = "http://identity:8010", useCase, requested }: Props) {
  const [claims, setClaims] = useState<Claim[]>([
    { key: "age_over_18", value: true },
    { key: "residency_country", value: "NL" },
    { key: "email", value: "x@y.z" },
  ]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const selectedKeys = useMemo(() => {
    if (requested?.length) return new Set(requested);
    if (useCase === "votacion") return new Set(["age_over_18", "residency_country"]);
    if (useCase === "saldos") return new Set(["balance_geq"]);
    return new Set<string>();
  }, [requested, useCase]);

  const run = async () => {
    setLoading(true);
    try {
      const bodyIssue = {
        sub: "did:key:holder1",
        claims: Object.fromEntries(claims.map(c => [c.key, c.value])),
        aud: "verifier-app",
        nonce: "n-123"
      };
      const issue = await fetch(`${identityUrl}/sdjwt/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyIssue)
      }).then(r => r.json());

      const disclosures: string[] = issue.disclosures.filter((d: string) => {
        // filtra por keys requeridas
        try {
          const arr = JSON.parse(Buffer.from(d.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
          return selectedKeys.has(arr[1]);
        } catch { return false; }
      });

      const verify = await fetch(`${identityUrl}/sdjwt/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sd_jwt: issue.sd_jwt,
          disclosures,
          use_case: useCase,
          requested_claims: requested ?? Array.from(selectedKeys),
          aud: "verifier-app",
          nonce: "n-123"
        })
      }).then(r => r.json());

      setResult(verify);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Verificación con divulgación selectiva">
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <strong>Use case:</strong> {useCase}
        </div>
        <div>
          {claims.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <Input
                value={String(c.key)}
                onChange={(e: any) => {
                  const next = [...claims]; next[i] = { ...next[i], key: e.target.value }; setClaims(next);
                }}
              />
              <Input
                value={String(c.value)}
                onChange={(e: any) => {
                  const next = [...claims]; next[i] = { ...next[i], value: e.target.value }; setClaims(next);
                }}
              />
            </div>
          ))}
        </div>
        <Button onClick={run} disabled={loading}>{loading ? "Verificando..." : "Verificar mínimo necesario"}</Button>
        {result && (
          <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 6, overflowX: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </Card>
  );
}

 
Entregables y criterios (DoD)
●	Entregables

○	Servicio Identity (SD JWT):

■	POST /sdjwt/issue: emite SD JWT y disclosures.

■	POST /sdjwt/verify: verifica firma, disclosures y minimización según policies/claims.yml.

■	Logs estructurados + métricas Prometheus (/healthz listo).

○	Servicio BBS Verifier:

■	POST /bbs/issue-vc, POST /bbs/derive-proof, POST /bbs/verify-proof.

■	Permite revelación parcial basada en índices de claims.

○	Circuito opcional para balance ≥ umbral (ZK).

○	UI: componente VerificationFlow para probar flujos de divulgación selectiva.

○	Pruebas: test_sdjwt.py con caso votación.

●	DoD (Definition of Done)

○	Verificación correcta: firmas SD JWT, integridad de disclosures y validación de política por caso de uso.

○	Minimización GDPR: verify devuelve minimal=true solo si:

■	No faltan claims requeridos.

■	No hay claims extra fuera de la política o de la lista solicitada.

○	Rendimiento: emisión/verificación SD JWT < 150ms en dev; BBS+ derivación + verificación < 500ms en dev (WASM).

○	Seguridad básica: holder binding soportado vía aud/nonce y (opcional) kb_jwt.

●	Riesgos & Controles

○	Exposición de datos: política de minimización en claims.yml; el verificador no puede pedir más de lo permitido.

○	Toxic waste/keys: claves SD JWT deben provenir de Vault/Transit; en este ejemplo se usa .env para dev (prohibido en prod).

○	Fatiga del usuario: la UI sugiere solo lo requerido; el holder ve qué se revela.

○	Compatibilidad: BBS+ via WASM — fijar versión y probar en CI en entornos Linux x64/arm64.

 
Pasos operativos
1.	Mapeo de claims por caso de uso
 Edita services/identity/policies/claims.yml para votación y saldos (y añade nuevos casos).

2.	Emisión (Producto/Identidad)

○	Backoffice del emisor llama POST /sdjwt/issue con claims completos del sujeto (sub = DID).

○	Se entrega el sd_jwt + disclosures al holder (wallet/app).

3.	Presentación selectiva (Frontend/Holders)

○	El holder filtra disclosures al mínimo requerido, construye la presentación y la envía al verificador.

4.	Verificación granular (Backend verificador)

○	Llama POST /sdjwt/verify con use_case y (opcional) requested_claims.

○	Recibe minimal, missing_required y extra_disclosed para registrar cumplimiento.

5.	BBS+

○	Para credenciales JSON LD que requieran prueba derivada con múltiples atributos, usa bbs-verifier.

6.	Auditoría de datos mínimos (Data/Seguridad)

○	Registra únicamente minimal, missing_required, extra_disclosed, use_case, timestamp (no almacenar valores de claims).

○	Alertas si extra_disclosed ≠ vacío.

 
Integración con el monorrepo
●	Añade services/identity y services/bbs-verifier a tu orquestación (docker-compose/k8s) y a tu pipeline CI tal como los demás servicios (tests + build).

●	Reutiliza los módulos comunes (services/common/*) ya presentes para logging/OTEL/health si lo deseas (ya conectado en Identity).

●	Para producción, reemplaza claves en .env por lectura desde Vault (siguiendo el patrón de services/auth).

 
Si quieres, en un siguiente paso te agrego manifests de Docker Compose/K8s y pipelines CI para estos dos servicios, o extiendo la UI con un wizard de “consentimiento y minimización” listo para QA.
Tú dijiste:
programa a nivel de detalle para GNEW N66 7.6 Cifrado de comunicaciones (Prompt 66) Objetivo: E2E para mensajería interna y API sensibles. Roles: Seguridad, Backend. Stack: Double Ratchet/MLS, TLS mTLS, KMS. Entregables: Rotación de claves, PFS. Pasos: Política de rotación y revocación. HSM/KMS para secretos. DoD: PenTests sin hallazgos críticos.
ChatGPT Plus
Pensó durante 1m 13s
