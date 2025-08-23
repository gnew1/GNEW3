
import { Router } from "express";
import { pool } from "../db.js";

export const docs = Router();

docs.get("/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const d = await client.query("SELECT * FROM documents WHERE id=$1", [req.params.id]);
    if (!d.rowCount) return res.status(404).json({ ok: false, error: "not_found" });
    const chunks = await client.query("SELECT id, chunk_idx, left(content, 400) AS preview FROM chunks WHERE doc_id=$1 ORDER BY chunk_idx ASC", [req.params.id]);
    res.json({ ok: true, document: d.rows[0], chunks: chunks.rows });
  } finally {
    client.release();
  }
});


