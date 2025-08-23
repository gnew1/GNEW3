
import { Pool } from "pg";
import fs from "fs";
import path from "path";

export async function ensureMigrations(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await execFile(client, "001_init.sql");
    await execFile(client, "002_seed.sql");
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

async function execFile(client: any, fname: string) {
  const sql = fs.readFileSync(path.join(__dirname, "migrations", fname), "utf-8");
  await client.query(sql);
}


