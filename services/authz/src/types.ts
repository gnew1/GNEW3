export type Subject = {
  id: string;
  role: string;            // rol primario (ej. admin, manager)
  tenant: string;          // dominio/DAO
  department?: string;
  clearance?: number;      // 0..n
  attributes?: Record<string, string | number | boolean>;
};

export type Context = {
  tenant: string;
  projectOwnerId?: string;
  resourceOwnerId?: string;
  [k: string]: unknown;
};

export type DecisionInput = {
  sub: Subject;
  obj: string;     // recurso /api/...
  act: string;     // acción (GET, POST, write, read, approve)
  ctx: Context;
};

export type Decision = {
  allowed: boolean;
  policyVersion: number;
  decisionId: string;
  latencyMs: number;
};

