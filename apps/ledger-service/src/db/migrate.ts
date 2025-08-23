
import { Pool } from "pg";
import fs from "fs";
import path from "path";

export async function runMigrations(pool: Pool, applyTriggers = true) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await execFile(client, path.join(__dirname, "migrations/001_init.sql"));
    await execFile(client, path.join(__dirname, "migrations/002_views.sql"));
    if (applyTriggers) {
      await execFile(client, path.join(__dirname, "migrations/003_triggers.sql"));
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

async function execFile(client: any, file: string) {
  const sql = fs.readFileSync(file, "utf-8");
  await client.query(sql);
}


