
import { Ruleset, Rule } from "../engine/types";
import { detectCollisions } from "../engine/collision";
import { AuditStore } from "./audit";
import { hashToPct } from "../util/hash";
import crypto from "crypto";

export type CollisionReport = { ok: boolean; collisions: { a: string; b: string; reason: string }[] };

export type CanaryMap = {
  // Ej.: { "premium": { versionId: "rs_abc", percentage: 20 } }
  [segment: string]: { versionId: string; percentage: number };
};

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

export class RulesStore {
  private rulesets: Ruleset[] = [];
  private production?: string; // id de ruleset publicado (prod)
  private canary: CanaryMap = {};

  constructor(private audit: AuditStore) {
    // Seed inicial
    const rs: Ruleset = {
      id: uuid(),
      name: "default",
      version: 1,
      status: "published",
      rules: [
        {
          id: "r-welcome-5",
          name: "Welcome 5%",
          status: "active",
          priority: 100,
          scope: { segments: ["new"], riskMin: 0, riskMax: 1 },
          exclusive: false,
          effect: { type: "discount", discount: { type: "percent", value: 5 } },
        },
        {
          id: "r-risk-cap",
          name: "High risk cap",
          status: "active",
          priority: 50,
          scope: { riskMin: 0.7, riskMax: 1 },
          exclusive: false,
          effect: { type: "price_override", value: 999999 }, // effectively no discount for very high risk
        },
      ],
      createdAt: now(),
      createdBy: "system",
    };
    this.rulesets.push(rs);
    this.production = rs.id;
  }

  list(): Ruleset[] {
    return this.rulesets.slice().sort((a, b) => b.version - a.version);
  }

  getProduction(): Ruleset {
    const rs = this.rulesets.find((x) => x.id === this.production);
    if (!rs) throw new Error("no_production_ruleset");
    return rs;
  }

  getById(id: string): Ruleset | undefined {
    return this.rulesets.find((x) => x.id === id);
  }

  createDraft(name: string, rules: Rule[], user: string, notes?: string): Ruleset {
    const maxV = Math.max(0, ...this.rulesets.map((x) => x.version));
    const rs: Ruleset = {
      id: uuid(),
      name,
      version: maxV + 1,
      status: "draft",
      rules,
      notes,
      createdAt: now(),
      createdBy: user,
    };
    this.rulesets.push(rs);
    this.audit.log({ user, action: "ruleset.create_draft", after: { id: rs.id, version: rs.version } });
    return rs;
  }

  updateDraft(id: string, patch: Partial<Ruleset>, user: string): Ruleset {
    const rs = this.getById(id);
    if (!rs) throw new Error("not_found");
    if (rs.status !== "draft") throw new Error("not_draft");
    const before = JSON.parse(JSON.stringify(rs));
    if (patch.name) rs.name = patch.name;
    if (Array.isArray(patch.rules)) rs

Tú dijiste:
Como IA programadora de GNEW, ejecuta el siguiente prompt N del archivo "/mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt" empezando en N321 (N320 se ejecutó en la interacción actual) y avanza +1 en cada ejecución hasta N340, sin repetirte. Para cada prompt: 1) entrega exactamente lo pedido con código listo para producción; 2) empieza la respuesta con la RUTA COMPLETA del archivo de salida y debajo el código en el lenguaje indicado; 3) mantén coherencia con el monorepo (Node/TypeScript predominante, backend principal app.ts) y convenciones establecidas; 4) incluye pruebas y scripts de integración cuando proceda; 5) evita texto superfluo fuera de rutas+código salvo breves notas de uso; 6) conserva y actualiza un puntero interno de progreso para continuar en N+1 y detenerse al llegar a N340.
ChatGPT Plus
Pensó durante 1m 15s

