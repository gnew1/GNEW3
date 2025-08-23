
import crypto from "node:crypto";
import { db } from "./db.js";
import { cfg } from "./config.js";
import { makeGlue, listDatabases, listTables, listPartitions } from "./glue.js";

function id() { return crypto.randomUUID(); }

export async function syncFromGlue(): Promise<{ runId: string; dbs: number; tables: number; cols: number; parts: number }> {
  const sourceId = ensureSource("glue", "AWS Glue");
  const runId = createRun(sourceId);
  let dbs = 0, tables = 0, cols = 0, parts = 0;

  try {
    const glue = makeGlue();

    for await (const d of listDatabases(glue, cfg.gluePrefix ?? undefined)) {
      upsertDb({
        name: d.Name ?? "",
        description: d.Description ?? null,
        locationUri: d.LocationUri ?? null,
        parameters: d.Parameters ?? {}
      }, "glue", runId);
      dbs++;

      for await (const t of listTables(glue, d.Name!)) {
        upsertTable({
          dbName: d.Name!,
          name: t.Name!,
          description: t.Description ?? null,
          location: t.StorageDescriptor?.Location ?? null,
          format: t.Parameters?.["classification"] ?? guessFormat(t),
          serde: t.StorageDescriptor?.SerdeInfo?.SerializationLibrary ?? null,
          inputFormat: t.StorageDescriptor?.InputFormat ?? null,
          outputFormat: t.StorageDescriptor?.OutputFormat ?? null,
          parameters: t.Parameters ?? {},
          partitionKeys: (t.PartitionKeys ?? []).map(k => k.Name ?? "").filter(Boolean)
        }, "glue", runId);
        tables++;

        // columns
        const colsArr = (t.StorageDescriptor?.Columns ?? []).map((c, i) => ({
          dbName: d.Name!, tableName: t.Name!, name: c.Name!, type: c.Type ?? "string", comment: c.Comment ?? null, position: i
        }));
        for (const c of colsArr) upsertColumn(c, "glue", runId), cols++;

        // partitions
        const pkNames = (t.PartitionKeys ?? []).map(k => k.Name ?? "").filter(Boolean);
        if (pkNames.length) {
          for await (const p of listPartitions(glue, d.Name!, t.Name!)) {
            const spec: Record<string,string> = {};
            (p.Values ?? []).forEach((v, i) => spec[pkNames[i]] = String(v ?? ""));
            upsertPartition({
              dbName: d.Name!, tableName: t.Name!,
              spec, location: p.StorageDescriptor?.Location ?? null,
              parameters: p.Parameters ?? {}
            }, "glue", runId);
            parts++;
          }
        }
      }
    }

    finishRun(runId, true, { dbs, tables, cols, parts });
    return { runId, dbs, tables, cols, parts };
  } catch (e: any) {
    finishRun(runId, false, { error: e?.message ?? String(e) });
    throw e;
  }
}

/** Import desde JSON (Hive o export genérico) */
export function importFromJson(payload: any): { runId: string; dbs: number; tables: number; cols: number; parts: number } {
  const sourceId = ensureSource("import", "Hive Import JSON");
  const runId = createRun(sourceId);
  let dbs = 0, tables = 0, cols = 0, parts = 0;

  try {
    const databases = Array.isArray(payload.databases) ? payload.databases : [];
    const tablesArr = Array.isArray(payload.tables) ? payload.tables : [];

    for (const d of databases) {
      upsertDb({
        name: String(d.name),
        description: d.description ?? null,
        locationUri: d.locationUri ?? null,
        parameters: d.parameters ?? {}
      }, "import", runId);
      dbs++;
    }

    for (const t of tablesArr) {
      upsertTable({
        dbName: String(t.db),
        name: String(t.name),
        description: t.description ?? null,
        location: t.location ?? null,
        format: t.format ?? null,
        serde: t.serde ?? null,
        inputFormat: t.inputFormat ?? null,
        outputFormat: t.outputFormat ?? null,
        parameters: t.parameters ?? {},
        partitionKeys: Array.isArray(t.partitionKeys) ? t.partitionKeys : []
      }, "import", runId);
      tables++;

      const colsList = Array.isArray(t.columns) ? t.columns : [];
      colsList.forEach((c: any, i: number) => upsertColumn({
        dbName: String(t.db), tableName: String(t.name),
        name: String(c.name), type: String(c.type ?? "string"), comment: c.comment ?? null, position: i
      }, "import", runId), cols++);

      const partsList = Array.isArray(t.partitions) ? t.partitions : [];
      for (const p of partsList) {
        upsertPartition({
          dbName: String(t.db), tableName: String(t.name),
          spec: p.values ?? {}, location: p.location ?? null, parameters: p.parameters ?? {}
        }, "import", runId);
        parts++;
      }
    }

    finishRun(runId, true, { dbs, tables, cols, parts });
    return { runId, dbs, tables, cols, parts };
  } catch (e: any) {
    finishRun(runId, false, { error: e?.message ?? String(e) });
    throw e;
  }
}

// ------------------- helpers (DB) -------------------
function ensureSource(kind: string, label: string): string {
  const row = db.prepare("SELECT id FROM sources WHERE kind=? LIMIT 1").get(kind) as any;
  if (row?.id) return row.id as string;
  const sid = id();
  db.prepare("INSERT INTO sources(id,kind,label,createdAt) VALUES(?,?,?,?)")
    .run(sid, kind, label, Date.now());
  return sid;
}
function createRun(sourceId: string) {
  const runId = id();
  db.prepare("INSERT INTO runs(id,sourceId,startedAt) VALUES(?,?,?)").run(runId, sourceId, Date.now());
  return runId;
}
function finishRun(runId: string, ok: boolean, stats: any) {
  db.prepare("UPDATE runs SET finishedAt=?, ok=?, stats=? WHERE id=?")
    .run(Date.now(), ok ? 1 : 0, JSON.stringify(stats), runId);
}

function upsertDb(d: { name: string; description: string | null; locationUri: string | null; parameters: any }, source: string, runId: string) {
  db.prepare(`
    INSERT INTO databases(id,name,description,locationUri,parameters,source,runId,updatedAt)
    VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(name) DO UPDATE SET description=excluded.description, locationUri=excluded.locationUri, parameters=excluded.parameters, source=excluded.source, runId=excluded.runId, updatedAt=excluded.updatedAt
  `).run(id(), d.name, d.description, d.locationUri, JSON.stringify(d.parameters ?? {}), source, runId, Date.now());

  // index búsqueda
  db.prepare("INSERT INTO search_idx(kind,dbName,tableName,name,description,location,columns) VALUES(?,?,?,?,?,?,?)")
    .run("db", d.name, "", d.name, d.description ?? "", d.locationUri ?? "", "");
}

function upsertTable(t: {
  dbName: string; name: string; description: string | null; location: string | null; format: string | null;
  serde: string | null; inputFormat: string | null; outputFormat: string | null; parameters: any; partitionKeys: string[]
}, source: string, runId: string) {
  db.prepare(`
    INSERT INTO tables(id,dbName,name,description,location,format,serde,inputFormat,outputFormat,parameters,partitionKeys,source,runId,updatedAt)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(dbName,name) DO UPDATE SET description=excluded.description, location=excluded.location, format=excluded.format, serde=excluded.serde, inputFormat=excluded.inputFormat, outputFormat=excluded.outputFormat, parameters=excluded.parameters, partitionKeys=excluded.partitionKeys, source=excluded.source, runId=excluded.runId, updatedAt=excluded.updatedAt
  `).run(
    id(), t.dbName, t.name, t.description, t.location, t.format, t.serde, t.inputFormat, t.outputFormat,
    JSON.stringify(t.parameters ?? {}), JSON.stringify(t.partitionKeys ?? []), source, runId, Date.now()
  );

  db.prepare("INSERT INTO search_idx(kind,dbName,tableName,name,description,location,columns) VALUES(?,?,?,?,?,?,?)")
    .run("table", t.dbName, t.name, t.name, t.description ?? "", t.location ?? "", (t.partitionKeys ?? []).join(","));
}

function upsertColumn(c: { dbName: string; tableName: string; name: string; type: string; comment: string | null; position: number }, source: string, runId: string) {
  db.prepare(`
    INSERT INTO columns(id,dbName,tableName,name,type,comment,position,source,runId)
    VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(dbName,tableName,name) DO UPDATE SET type=excluded.type, comment=excluded.comment, position=excluded.position, source=excluded.source, runId=excluded.runId
  `).run(id(), c.dbName, c.tableName, c.name, c.type, c.comment, c.position, source, runId);

  // actualizar índice de columnas de la tabla (concatenado)
  const cols = db.prepare("SELECT name||':'||type AS nt FROM columns WHERE dbName=? AND tableName=? ORDER BY position ASC").all(c.dbName, c.tableName) as any[];
  db.prepare("INSERT INTO search_idx(kind,dbName,tableName,name,description,location,columns) VALUES(?,?,?,?,?,?,?)")
    .run("column", c.dbName, c.tableName, c.name, c.comment ?? "", "", "");
  db.prepare("UPDATE search_idx SET columns=? WHERE kind='table' AND dbName=? AND tableName=? AND name=?")
    .run((cols.map(r => r.nt).join(", ")), c.dbName, c.tableName, c.tableName);
}

function upsertPartition(p: { dbName: string; tableName: string; spec: Record<string,string>; location: string | null; parameters: any }, source: string, runId: string) {
  db.prepare(`
    INSERT INTO partitions(id,dbName,tableName,spec,location,parameters,source,runId)
    VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(dbName,tableName,spec) DO UPDATE SET location=excluded.location, parameters=excluded.parameters, source=excluded.source, runId=excluded.runId
  `).run(id(), p.dbName, p.tableName, JSON.stringify(p.spec ?? {}), p.location, JSON.stringify(p.parameters ?? {}), source, runId);
}

function guessFormat(t: any): string | null {
  const src = (t.StorageDescriptor?.Location ?? "").toLowerCase();
  if (src.endsWith(".parquet") || (t.StorageDescriptor?.SerdeInfo?.SerializationLibrary ?? "").toLowerCase().includes("parquet")) return "parquet";
  if ((t.Parameters?.["classification"] ?? "").toLowerCase().includes("json")) return "json";
  if ((t.Parameters?.["classification"] ?? "").toLowerCase().includes("csv")) return "csv";
  return t.Parameters?.["classification"] ?? null;
}


