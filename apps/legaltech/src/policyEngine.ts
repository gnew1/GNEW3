
/**
 * GNEW · N335 — Policy-as-Code (OPA) central
 * Rol: Sec + Backend
 * Objetivo: Decisiones de acceso/pago como políticas.
 * Stack: OPA, bundles firmados, editor.
 * Entregables: Repos de políticas + tests.
 * Pasos: Flujos de revisión/rollback.
 * Pruebas/DoD: 100% tests; latencia < 5 ms.
 * Seguridad & Observabilidad: Firmas y logs.
 * Despliegue: GitOps.
 */

import { execSync } from "child_process";
import * as crypto from "crypto";
import { Request, Response } from "express";
import express from "express";

const app = express();
app.use(express.json());

const POLICY_DIR = process.env.POLICY_DIR ?? "./policies";
const SIGN_KEY = process.env.SIGN_KEY ?? "secret-sign-key";

function signBundle(bundle: Buffer): string {
  return crypto.createHmac("sha256", SIGN_KEY).update(bundle).digest("hex");
}

export function loadPolicy(policyName: string): string {
  try {
    const result = execSync(
      `opa eval --data ${POLICY_DIR}/${policyName}.rego --format json 'data'`
    );
    return result.toString();
  } catch (err) {
    throw new Error("OPA policy load failed: " + (err as Error).message);
  }
}

app.post("/policy/eval", (req: Request, res: Response) => {
  const { input, policy } = req.body;
  try {
    const output = execSync(
      `opa eval --data ${POLICY_DIR}/${policy}.rego --input <(echo '${JSON.stringify(
        input
      )}') 'data' --format json`,
      { shell: "/bin/bash" }
    );
    res.json(JSON.parse(output.toString()));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/policy/sign", (req: Request, res: Response) => {
  const { bundle } = req.body;
  const signature = signBundle(Buffer.from(bundle));
  res.json({ signature });
});

export function startPolicyEngine(port = 4000) {
  app.listen(port, () => {
    console.log(`Policy Engine running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startPolicyEngine();
}


