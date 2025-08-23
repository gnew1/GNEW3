
import { z } from "zod";
import { db } from "./db.js";
import { upsertDataset, bumpVersion, setSchema, findDatasetByKey } from "./store.js";
import { nanoid } from "nanoid";
import { writeAudit } from "./audit.js";

const DatasetRef = z.object({
  namespace: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive().optional(),
  schema: z.array(z.object({ name: z.string(), type: z.string().optional(), nullable: z.boolean().optional() })).optional()
});

const Mapping = z.object({
  from: z.object({ dataset: z.string().min(3), column: z.string().min(1) }), // dataset key "ns.name"
  to:   z.object({ dataset: z.string().min(3), column: z.string().min(1) }),
  transform: z.string().optional()
});

export const IngestReq = z.object({
  run: z.object({
    runId: z.string().min(3),
    jobName: z.string().min(1),
    pipeline: z.string().min(1).optional(),
    producer: z.string().optional(),
    startedAt: z.number().int().optional(),
    endedAt: z.number().int().optional(),
    status: z.enum(["running","completed","failed"]).optional()
  }),
  reads: z.array(DatasetRef).default([]),
  writes: z.array(DatasetRef).default([]),
  mappings: z.array(Mapping).optional()
});

export type Ingest = z.infer<typeof IngestReq>;

export function ingest(ev: Ingest) {
  const p = IngestReq.parse(ev);
  const now = Date.now();

  // Upsert job
  const job = db.prepare("SELECT runId FROM jobs WHERE runId=?").get(p.run.runId) as any;
  if (job?.runId) {
    db.prepare("UPDATE jobs SET jobName=?, pipeline=?, producer=?, startedAt=?, endedAt=?, status=? WHERE runId=?")
      .run(p.run.jobName, p.run.pipeline ?? null, p.run.producer ?? null, p.run.startedAt ?? now, p.run.endedAt ?? null, p.run.status ?? "running", p.run.runId);
  } else {
    db.prepare("INSERT INTO jobs(runId,jobName,pipeline,producer,startedAt,endedAt,status) VALUES(?,?,?,?,?,?,?)")
      .run(p.run.runId, p.run.jobName, p.run.pipeline ?? null, p.run.producer ?? null, p.run.startedAt ?? now, p.run.endedAt ?? null, p.run.status ?? "running");
  }

  // Datasets (reads/writes) y esquemas/versiones
  const touch = (r: z.infer<typeof DatasetRef>, kind: "READ" | "WRITE") => {
    const ds = upsertDataset(r.namespace, r.name);
    let ver = r.version;
    if (!ver && r.schema) {
      ver = bumpVersion(ds.id);
      setSchema(ds.id, ver, r.schema);
    }
    db.prepare("INSERT INTO edges(id,type,srcDatasetId,srcColumn,dstDatasetId,dstColumn,runId,transform,createdAt) VALUES(?,?,?,?,?,?,?,?,?)")
      .run(nanoid(), kind, null, null, ds.id, null, p.run.runId, null, now);
    return { id: ds.id, key: ds.key, version: ver ?? 1 };
  };

  const readDs  = p.reads.map(r => touch(r, "READ"));
  const writeDs = p.writes.map(r => touch(r, "WRITE"));

  // Mappings columna‑a‑columna
  for (const m of (p.mappings ?? [])) {
    const src = findDatasetByKey(m.from.dataset);
    const dst = findDatasetByKey(m.to.dataset);
    if (!src || !dst) continue;
    db.prepare("INSERT INTO edges(id,type,srcDatasetId,srcColumn,dstDatasetId,dstColumn,runId,transform,createdAt) VALUES(?,?,?,?,?,?,?,?,?)")
      .run(nanoid(), "DERIVE", src.id, m.from.column, dst.id, m.to.column, p.run.runId, m.transform ?? null, now);
  }

  writeAudit(p.run.runId, "INGEST", p);
  return { runId: p.run.runId, reads: readDs, writes: writeDs };
}


