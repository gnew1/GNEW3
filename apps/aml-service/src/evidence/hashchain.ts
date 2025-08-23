
import { randomUUID } from "crypto";
import { createHash } from "crypto";

export async function anchorEvidence(client: any, payload: any) {
  const prev = await client.query("select hash from aml_evidence order by created_at desc limit 1");
  const prevHash = prev.rowCount ? (prev.rows[0].hash as string) : null;
  const id = randomUUID();
  const body = JSON.stringify(payload);
  const hash = createHash("sha256").update((prevHash ?? "") + body).digest("hex");
  await client.query(
    "insert into aml_evidence(id,prev_hash,hash,payload) values($1,$2,$3,$4)",
    [id, prevHash, hash, payload]
  );
  return { id, hash, prevHash };
}


