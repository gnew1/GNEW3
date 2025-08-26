
import { Router } from "express";
import { db } from "../db.js";

export const catalog = Router();

catalog.get("/catalog/databases", (_req, res) => {
  const rows = db.prepare("SELECT name, description, locationUri FROM databases ORDER BY name ASC").all();
  res.json({ ok: true, items: rows });
});

catalog.get("/catalog/tables", (req, res) => {
  const dbName = typeof req.query.db === "string" ? req.query.db : "";
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!dbName) return res.status(400).json({ ok: false, error: "db_required" });
  const rows = q
    ? db.prepare("SELECT name, description, location, format FROM tables WHERE dbName=? AND (name LIKE ? OR description LIKE ?) ORDER BY name ASC")
        .all(dbName, `%${q}%`, `%${q}%`)
    : db.prepare("SELECT name, description, location, format FROM tables WHERE dbName=? ORDER BY name ASC").all(dbName);
  res.json({ ok: true, db: dbName, items: rows });
});

catalog.get("/catalog/tables/:db/:table", (req, res) => {
  const t = db.prepare("SELECT * FROM tables WHERE dbName=? AND name=?").get(req.params.db, req.params.table);
  if (!t) return res.status(404).json({ ok: false, error: "not_found" });
  const cols = db.prepare("SELECT name, type, comment, position FROM columns WHERE dbName=? AND tableName=? ORDER BY position ASC")
    .all(req.params.db, req.params.table);
  res.json({ ok: true, table: t, columns: cols });
});

catalog.get("/catalog/columns", (req, res) => {
  const dbName = typeof req.query.db === "string" ? req.query.db : "";
  const table = typeof req.query.table === "string" ? req.query.table : "";
  if (!dbName || !table) return res.status(400).json({ ok: false, error: "db_table_required" });
  const rows = db.prepare("SELECT name, type, comment, position FROM columns WHERE dbName=? AND tableName=? ORDER BY position ASC")
    .all(dbName, table);
  res.json({ ok: true, items: rows });
});

catalog.get("/catalog/partitions", (req, res) => {
  const dbName = typeof req.query.db === "string" ? req.query.db : "";
  const table = typeof req.query.table === "string" ? req.query.table : "";
  const limit = Math.min(5000, Math.max(1, Number(req.query.limit ?? 200)));
  if (!dbName || !table) return res.status(400).json({ ok: false, error: "db_table_required" });
  const rows = db.prepare("SELECT spec, location FROM partitions WHERE dbName=? AND tableName=? ORDER BY spec ASC LIMIT ?")
    .all(dbName, table, limit)
    .map((r: any) => ({ spec: JSON.parse(r.spec), location: r.location }));
  res.json({ ok: true, items: rows });
});

catalog.get("/search", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return res.status(400).json({ ok: false, error: "q_required" });
  const rows = db.prepare(`
    SELECT kind, dbName, tableName, name, description, location, columns
    FROM search_idx
    WHERE search_idx MATCH ?
    LIMIT 200
  `).all(q.replace(/\s+/g, " AND "));
  res.json({ ok: true, items: rows });
});


