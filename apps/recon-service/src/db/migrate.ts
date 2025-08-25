
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export async function ensureMigrations(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await execFile(client, "001_init.sql");
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

type Queryable = { query: (sql: string, params?: unknown[]) => Promise<unknown> };
async function execFile(client: Queryable, fname: string) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sql = fs.readFileSync(path.join(here, "migrations", fname), "utf-8");
  await client.query(sql);
}


