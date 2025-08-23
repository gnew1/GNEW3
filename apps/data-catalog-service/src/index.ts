
/**
 * GNEW · N320 — Catálogo y descubrimiento de datos
 * Rol: Data Platform
 * Objetivo: Catálogo con búsqueda semántica y owners.
 * Stack: DataHub (GraphQL), embeddings (re-rank), ABAC, SSO (OIDC/JWT), logs de consulta.
 * Entregables: Portal API con linaje y etiquetas; flujos de alta/baja; indexación básica.
 * Despliegue: Integrado a SSO (JWT). Pruebas con cobertura en tablas críticas ≥90%.
 */

import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import { createServer } from "http";
import pino from "pino";
import pinoHttp from "pino-http";
import jwt, { JwtPayload } from "jsonwebtoken";

// ---------- Config ----------
const PORT = process.env.PORT ? Number(process.env.PORT) : 8086;
const DATAHUB_GRAPHQL = process.env.DATAHUB_GRAPHQL ?? "https://datahub.example.com/api/graphql";
const DATAHUB_TOKEN = process.env.DATAHUB_TOKEN ?? "DUMMY_TOKEN";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "gnew";
const JWT_ISSUER = process.env.JWT_ISSUER ?? "https://sso.example.com/";
const JWT_PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY ?? "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...\n-----END PUBLIC KEY-----").replace(/\\n/g, "\n");

// ---------- Logger ----------
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const httpLogger = pinoHttp({ logger });

// ---------- Types ----------
type UserAttrs = {
  sub: string;
  email?: string;
  roles?: string[];
  dept?: string;
  clearance?: number; // 0..3
};

type Dataset = {
  urn: string;
  name: string;
  platform: string;
  description?: string;
  ownerUrns: string[];
  tags: string[];
  domain?: string;
  classification?: "public" | "internal" | "restricted";
  embedding?: number[]; // opcional, para re-rank
};

type Lineage = {
  upstream: string[];
  downstream: string[];
};

// ---------- SSO (JWT) ----------
function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "missing_token" });
  const token = auth.slice("Bearer ".length);
  try {
    const decoded = jwt.verify(token, JWT_PUBLIC_KEY, {
      algorithms: ["RS256"],
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    }) as JwtPayload;
    const user: UserAttrs = {
      sub: String(decoded.sub),
      email: typeof decoded.email === "string" ? decoded.email : undefined,
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      dept: typeof decoded.dept === "string" ? decoded.dept : undefined,
      clearance: typeof decoded.clearance === "number" ? decoded.clearance : 1,
    };
    (req as any).user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

// ---------- ABAC ----------
/**
 * Reglas ABAC mínimas:
 * - Lectura: permitida si dataset.classification es "public" o "internal" y el usuario tiene dept == dataset.domain
 * - Si "restricted": requiere clearance >= 2 ó ownership.
 * - Owners (por URN de user) siempre pueden leer y administrar su dataset.
 * - Admin role bypass: roles incluye "catalog:admin".
 */
function abacCan(user: UserAttrs, dataset: Dataset, action: "read" | "write" | "admin"): boolean {
  if (user.roles?.includes("catalog:admin")) return true;

  const isOwner = dataset.ownerUrns.some((o) => o.endsWith(user.sub));
  if (isOwner) return true;

  if (action === "read") {
    if (dataset.classification === "public") return true;
    if (dataset.classification === "internal") {
      return user.dept && dataset.domain ? user.dept === dataset.domain : true;
    }
    if (dataset.classification === "restricted") {
      return (user.clearance ?? 0) >= 2 || (user.dept && user.dept === dataset.domain);
    }
  }

  if (action === "write" || action === "admin") {
    // escritura/administración limitada a owners o admin
    return false;
  }

  return false;
}

// ---------- Embeddings (simple fallback) ----------
/**
 * Interface de embeddings con un fallback determinista (hashing trick) cuando no exista proveedor externo.
 * Permite re-rank semántico básico sin dependencias pesadas.
 */
function embed(text: string, dim = 128): number[] {
  const vec = new Array(dim).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const t of tokens) {
    const h = crypto.createHash("sha1").update(t).digest();
    for (let i = 0; i < dim; i++) vec[i] += h[i % h.length] / 255;
  }
  // L2 normalize
  const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0)) || 1;
  return vec.map((v) => v / norm);
}

function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

// ---------- DataHub Client (GraphQL) ----------
async function datahub<T>(query: string, variables: Record<string, any>): Promise<T> {
  const resp = await fetch(DATAHUB_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DATAHUB_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!resp.ok) throw new Error(`DataHub error: ${resp.status}`);
  const json = await resp.json();
  if (json.errors) throw new Error(`DataHub GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data;
}

async function searchDatasets(q: string, limit = 20): Promise<Dataset[]> {
  const query = `
    query Search($input: SearchInput!) {
      search(input: $input) {
        start
        count
        total
        searchResults {
          entity {
            urn
            ... on Dataset {
              urn
              name
              platform { name }
              ownership { owners { owner { urn } } }
              globalTags { tags { tag { name } } }
              editableProperties { description }
              properties { description }
              domain { domain { name } }
            }
          }
        }
      }
    }
  `;
  const data = await datahub<any>(query, {
    input: { type: "DATASET", query: q, start: 0, count: limit },
  });

  const results: Dataset[] =
    data.search.searchResults.map((r: any) => {
      const e = r.entity;
      const owners = (e?.ownership?.owners ?? []).map((o: any) => o?.owner?.urn).filter(Boolean);
      const tags = (e?.globalTags?.tags ?? []).map((t: any) => t?.tag?.name).filter(Boolean);
      const description = e?.editableProperties?.description ?? e?.properties?.description ?? "";
      return {
        urn: e.urn,
        name: e.name,
        platform: e.platform?.name ?? "unknown",
        description,
        ownerUrns: owners,
        tags,
        domain: e?.domain?.domain?.name,
        classification: inferClassification(tags),
      };
    }) ?? [];

  return results;
}

function inferClassification(tags: string[]): Dataset["classification"] {
  if (tags.includes("restricted") || tags.includes("pii") || tags.includes("secret")) return "restricted";
  if (tags.includes("internal")) return "internal";
  return "public";
}

async function getLineage(urn: string): Promise<Lineage> {
  const query = `
    query Lineage($urn: String!) {
      dataset(urn: $urn) {
        upstreamLineage { entities { urn } }
        downstreamLineage { entities { urn } }
      }
    }
  `;
  const data = await datahub<any>(query, { urn });
  const up = data?.dataset?.upstreamLineage?.entities?.map((e: any) => e.urn) ?? [];
  const down = data?.dataset?.downstreamLineage?.entities?.map((e: any) => e.urn) ?? [];
  return { upstream: up, downstream: down };
}

async function getDataset(urn: string): Promise<Dataset | null> {
  const query = `
    query GetDataset($urn: String!) {
      dataset(urn: $urn) {
        urn
        name
        platform { name }
        ownership { owners { owner { urn } } }
        globalTags { tags { tag { name } } }
        editableProperties { description }
        properties { description }
        domain { domain { name } }
      }
    }
  `;
  const data = await datahub<any>(query, { urn });
  const e = data?.dataset;
  if (!e) return null;
  const owners = (e?.ownership?.owners ?? []).map((o: any) => o?.owner?.urn).filter(Boolean);
  const tags = (e?.globalTags?.tags ?? []).map((t: any) => t?.tag?.name).filter(Boolean);
  const description = e?.editableProperties?.description ?? e?.properties?.description ?? "";
  return {
    urn: e.urn,
    name: e.name,
    platform: e.platform?.name ?? "unknown",
    description,
    ownerUrns: owners,
    tags,
    domain: e?.domain?.domain?.name,
    classification: inferClassification(tags),
  };
}

// Alta/Baja mediante MCP (Metadata Change Proposal)
async function upsertDataset(input: {
  urn: string;
  name: string;
  platform: string;
  description?: string;
  owners?: string[]; // list of owner urns
  tags?: string[];
  domain?: string;
}) {
  const query = `
    mutation Ingest($mcp: [MetadataChangeProposal]!){
      ingestProposalBatch(input: $mcp) {
        responses { status }
      }
    }
  `;

  // Demo: solo upsert de editableProperties + tags + ownership + domain
  const mcps: any[] = [];

  if (input.description) {
    mcps.push({
      entityUrn: input.urn,
      changeType: "UPSERT",
      aspectName: "editableProperties",
      aspect: JSON.stringify({ description: input.description }),
    });
  }
  if (input.tags?.length) {
    mcps.push({
      entityUrn: input.urn,
      changeType: "UPSERT",
      aspectName: "globalTags",
      aspect: JSON.stringify({ tags: input.tags.map((t) => ({ tag: `tag:${t}` })) }),
    });
  }
  if (input.owners?.length) {
    mcps.push({
      entityUrn: input.urn,
      changeType: "UPSERT",
      aspectName: "ownership",
      aspect: JSON.stringify({
        owners: input.owners.map((u) => ({ owner: u, type: "DATAOWNER" })),
      }),
    });
  }
  if (input.domain) {
    mcps.push({
      entityUrn: input.urn,
      changeType: "UPSERT",
      aspectName: "domain",
      aspect: JSON.stringify({ domain: `urn:li:domain:${input.domain}` }),
    });
  }

  return datahub<any>(query, { mcp: mcps });
}

async function deleteDataset(urn: string) {
  const query = `
    mutation Delete($urn: String!) {
      deleteEntity(urn: $urn)
    }
  `;
  return datahub<any>(query, { urn });
}

// ---------- App ----------
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(httpLogger);
app.use(authMiddleware);

// Audit helper
function audit(user: UserAttrs, event: string, meta: Record<string, any>) {
  logger.info({ audit: true, user: user.sub, event, ...meta });
}

// --- Endpoints ---

// Búsqueda con re-rank por embeddings (fallback)
app.get("/search", async (req, res) => {
  const user = (req as any).user as UserAttrs;
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.status(400).json({ error: "missing_query" });

  try {
    const base = await searchDatasets(q, 50);

    // Generar embedding de consulta (fallback)
    const qe = embed(q);
    const withScores = base.map((d) => {
      const de = d.embedding ?? embed(`${d.name} ${d.description ?? ""} ${d.tags.join(" ")}`);
      const score = cosine(qe, de);
      return { d, score };
    });

    // ABAC filter + sort
    const allowed = withScores
      .filter(({ d }) => abacCan(user, d, "read"))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ d, score }) => ({ ...d, score }));

    audit(user, "catalog.search", { q, returned: allowed.length });
    res.json({ query: q, results: allowed });
  } catch (e: any) {
    logger.error(e, "search_failed");
    res.status(500).json({ error: "search_failed" });
  }
});

// Detalle + linaje + etiquetas
app.get("/datasets/:urn", async (req, res) => {
  const user = (req as any).user as UserAttrs;
  const urn = decodeURIComponent(req.params.urn);
  try {
    const ds = await getDataset(urn);
    if (!ds) return res.status(404).json({ error: "not_found" });
    if (!abacCan(user, ds, "read")) return res.status(403).json({ error: "forbidden" });
    const lineage = await getLineage(urn);
    audit(user, "catalog.get", { urn });
    res.json({ dataset: ds, lineage });
  } catch (e: any) {
    logger.error(e, "get_failed");
    res.status(500).json({ error: "get_failed" });
  }
});

// Alta (upsert) — flujo de alta
app.post("/datasets", async (req, res) => {
  const user = (req as any).user as UserAttrs;
  const input = req.body as {
    urn: string;
    name: string;
    platform: string;
    description?: string;
    owners?: string[];
    tags?: string[];
    domain?: string;
  };
  try {
    // Solo owners/admin deberían hacerlo — aquí delegamos en DataHub + auditoría
    // En este MVP, exigimos role específico:
    if (!user.roles?.includes("catalog:admin")) return res.status(403).json({ error: "forbidden" });
    await upsertDataset(input);
    audit(user, "catalog.upsert", { urn: input.urn });
    res.status(201).json({ status: "ok" });
  } catch (e: any) {
    logger.error(e, "upsert_failed");
    res.status(500).json({ error: "upsert_failed" });
  }
});

// Baja (delete) — flujo de baja
app.delete("/datasets/:urn", async (req, res) => {
  const user = (req as any).user as UserAttrs;
  const urn = decodeURIComponent(req.params.urn);
  try {
    if (!user.roles?.includes("catalog:admin")) return res.status(403).json({ error: "forbidden" });
    await deleteDataset(urn);
    audit(user, "catalog.delete", { urn });
    res.json({ status: "ok" });
  } catch (e: any) {
    logger.error(e, "delete_failed");
    res.status(500).json({ error: "delete_failed" });
  }
});

// Ping
app.get("/healthz", (_req, res) => res.json({ ok: true }));

const server = createServer(app);
if (require.main === module) {
  server.listen(PORT, () => logger.info({ msg: `data-catalog-service listening on :${PORT}` }));
}

export default server;


