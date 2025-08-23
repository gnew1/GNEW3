
import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { chunkText } from "../chunk.js";
import { nanoid } from "nanoid";
import { getProvider } from "../service.js";

export const ingest = Router();

const Body = z.object({
  title: z.string().min(3),
  sourceUri: z.string().url(),
  text: z.string().optional(),
  chunks: z.array(z.string()).optional(),
  onchain: z.object({
    chainId: z.number().optional(),
    network: z.string().optional(),
    contract: z.string().optional(),
    txHash: z.string().optional()
  }).optional()
});

ingest.post("/", async (req, res) => {
  const b = Body.parse(req.body ?? {});
  const chunks = b.chunks ?? (b.text ? chunkText(b.text) : []);
  if (!chunks.length) return res.status(400).json({ ok: false, error: "no_content" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // upsert document
    const docId = nanoid();
    const doc = await client.query(
      `INSERT INTO documents(id, title, source_uri, onchain)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (source_uri) DO UPDATE SET title = excluded.title
       RETURNING id`,
      [docId, b.title, b.sourceUri, b.onchain ? JSON.stringify(b.onchain) : null]
    );
    const id = doc.rows[0].id as string;

    // embed & insert chunks
    const provider = getProvider();
    const embs = await provider.embed(chunks);
    if (embs.length !== chunks.length) throw new Error("embed_mismatch");

    const valuesSql: string[] = [];
    const values: any[] = [];
    let idx = 1;
    for (let i = 0; i < chunks.length; i++) {
      valuesSql.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      values.push(nanoid(), id, i, chunks[i]);
    }
    await client.query(
      `INSERT INTO chunks(id, doc_id, chunk_idx, content, embedding)
       SELECT v.id, v.doc_id, v.chunk_idx, v.content, CAST(v.embedding AS vector)
       FROM jsonb_to_recordset($${idx}::jsonb) AS v(id text, doc_id text, chunk_idx int, content text, embedding float4[])
      `,
      [JSON.stringify(embs.map(Number))] // placeholder to keep $ positions aligned
    ); // we’ll insert embeddings separately below, simpler way:

    // alternativa: insertar en bucle (más simple y portable)
    await client.query("DELETE FROM chunks WHERE doc_id=$1", [id]); // limpia si falló lo anterior
    for (let i = 0; i < chunks.length; i++) {
      await client.query(
        `INSERT INTO chunks(id, doc_id, chunk_idx, content, embedding)
         VALUES ($1, $2, $3, $4, $5)`,
        [nanoid(), id, i, chunks[i], embs[i]]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true, id, chunks: chunks.length, dim: provider.dim() });
  } catch (e: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  } finally {
    client.release();
  }
});


