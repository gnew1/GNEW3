
import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { getProvider } from "../service.js";

export const search = Router();

search.get("/", async (req, res) => {
  const q = String(req.query.q ?? "");
  const k = Math.min(50, Math.max(1, Number(req.query.k ?? 5)));

  if (!q.trim()) return res.status(400).json({ ok: false, error: "q_required" });

  const provider = getProvider();
  const [queryVec] = await provider.embed([q]);

  const client = await pool.connect();
  try {
    const sql = `
      SELECT c.id, c.content, d.id as doc_id, d.title, d.source_uri,
             (1 - (c.embedding <=> $1)) AS similarity, c.chunk_idx
      FROM chunks c
      JOIN documents d ON d.id = c.doc_id
      ORDER BY c.embedding <=> $1
      LIMIT $2
    `;
    const rs = await client.query(sql, [queryVec, k]);
    const results = rs.rows.map((r) => ({
      chunkId: r.id,
      content: r.content,
      similarity: Number(r.similarity),
      citation: {
        docId: r.doc_id,
        title: r.title,
        uri: r.source_uri,
        range: `chunk#${r.chunk_idx}`
      }
    }));
    res.json({ ok: true, query: q, k, results });
  } finally {
    client.release();
  }
});


