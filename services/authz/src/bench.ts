// Bench rápido: valida objetivo <50ms con caching caliente.
import { buildEnforcer } from "./casbin/enforcer";
import fs from "node:fs/promises";
import path from "node:path";

(async () => {
  const model = await fs.readFile(path.resolve("policies/authz/model.conf"), "utf8");
  const policy = await fs.readFile(path.resolve("policies/authz/policy.csv"), "utf8");
  const e = await buildEnforcer(model, policy);

  const sub = { id: "u1", role: "role_finance", tenant: "daoX", clearance: 4, department: "finance" };
  const ctx = { tenant: "daoX" };
  const N = 1000;
  const t0 = performance.now();
  for (let i=0;i<N;i++) {
    await e.enforce(sub, "/api/ledger/tx/123", "GET", ctx);
  }
  const dt = (performance.now() - t0) / N;
  console.log(`avg ${dt.toFixed(2)} ms per decision`);
  if (dt > 50) process.exit(1);
})();

