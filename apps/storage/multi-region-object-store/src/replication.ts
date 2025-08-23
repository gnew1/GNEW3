
import { db } from "./db.js";
import { getObject, putStream } from "./s3.js";

export async function replicateKey(key: string) {
  try {
    // Descargar desde primary y subir a secondary
    const src = await getObject("primary", key);
    const put = await putStream("secondary", key, src.body, src.contentType);
    db.prepare(`
      INSERT INTO replication(key, primaryEtag, secondaryEtag, status, lastError, updatedAt)
      VALUES(?,?,?,?,?,?)
      ON CONFLICT(key) DO UPDATE SET secondaryEtag=excluded.secondaryEtag, status=excluded.status, lastError=NULL, updatedAt=excluded.updatedAt
    `).run(key, src.etag, put.etag, "ok", null, Date.now());
  } catch (e: any) {
    db.prepare(`
      INSERT INTO replication(key, status, lastError, updatedAt)
      VALUES(?,?,?,?)
      ON CONFLICT(key) DO UPDATE SET status=excluded.status, lastError=excluded.lastError, updatedAt=excluded.updatedAt
    `).run(key, "error", String(e?.message ?? e), Date.now());
  }
}


