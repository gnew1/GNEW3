
import { Pool } from "pg";
import { cfg } from "./config.js";
import { vector } from "pgvector";

export const pool = new Pool({ connectionString: cfg.dbUrl });
vector.registerType(pool);

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents(
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        source_uri TEXT UNIQUE NOT NULL,
        onchain JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='chunks' AND column_name='embedding'
        ) THEN
          EXECUTE format('CREATE TABLE chunks(
            id TEXT PRIMARY KEY,
            doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            chunk_idx INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding vector(%s) NOT NULL
          )', ${cfg.vectorDim});
        END IF;
      END$$;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS ix_chunks_doc ON chunks(doc_id, chunk_idx);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS ix_chunks_vec ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    `);
  } finally {
    client.release();
  }
}


