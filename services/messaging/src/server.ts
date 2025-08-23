/**
 * Mailbox E2E (Double Ratchet): el servidor sólo enruta y almacena CIPHERTEXT + headers.
 * mTLS se gestiona en Envoy (ver infra/envoy/envoy.yaml). Aquí reforzamos cabeceras/CSRF off.
 */
import express from "express";
import helmet from "helmet";
import Database from "better-sqlite3";

const db = new Database(":memory:");
db.exec(`
CREATE TABLE IF NOT EXISTS prekeys (
  user TEXT PRIMARY KEY,
  identity_pk TEXT NOT NULL,
  signed_prekey_pk TEXT NOT NULL,
  one_time_pk TEXT
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_user TEXT NOT NULL,
  from_user TEXT NOT NULL,
  header TEXT NOT NULL,         -- JSON Header (dhPub, pn, n, ad)
  nonce TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use(helmet());

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

// Subida/rotación de prekeys (rotación frecuente = mejor PFS inicial)
app.post("/prekeys", (req, res) => {
  const { user, identity_pk, signed_prekey_pk, one_time_pk } = req.body || {};
  if (!user || !identity_pk || !signed_prekey_pk) return res.status(400).json({ error: "missing" });
  db.prepare(
    `INSERT INTO prekeys(user, identity_pk, signed_prekey_pk, one_time_pk)
     VALUES(@user,@identity_pk,@signed_prekey_pk,@one_time_pk)
     ON CONFLICT(user) DO UPDATE SET
       identity_pk=excluded.identity_pk,
       signed_prekey_pk=excluded.signed_prekey_pk,
       one_time_pk=excluded.one_time_pk`
  ).run({ user, identity_pk, signed_prekey_pk, one_time_pk: one_time_pk ?? null });
  res.json({ ok: true });
});

// Obtener bundle para iniciar X3DH
app.get("/prekeys/:user", (req, res) => {
  const row = db.prepare(`SELECT * FROM prekeys WHERE user=?`).get(req.params.user);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({
    identity_pk: row.identity_pk,
    signed_prekey_pk: row.signed_prekey_pk,
    one_time_pk: row.one_time_pk
  });
});

// Enviar mensaje cifrado (header + ct + nonce)
app.post("/messages", (req, res) => {
  const { to_user, from_user, header, nonce, ciphertext } = req.body || {};
  if (!to_user || !from_user || !header || !nonce || !ciphertext) {
    return res.status(400).json({ error: "missing" });
  }
  db.prepare(
    `INSERT INTO messages(to_user, from_user, header, nonce, ciphertext)
     VALUES(?,?,?,?,?)`
  ).run(to_user, from_user, JSON.stringify(header), nonce, ciphertext);
  res.json({ ok: true });
});

// Obtener mensajes pendientes (pull)
app.get("/messages", (req, res) => {
  const u = req.query.user as string;
  if (!u) return res.status(400).json({ error: "user required" });
  const rows = db.prepare(`SELECT id, from_user, header, nonce, ciphertext FROM messages WHERE to_user=? ORDER BY id ASC`).all(u);
  // Best-effort: no eliminar hasta ack explícito para tolerancia a fallos
  res.json(rows.map(r => ({ id: r.id, from_user: r.from_user, header: JSON.parse(r.header), nonce: r.nonce, ciphertext: r.ciphertext })));
});

// ACK (borrado de mensajes ya recibidos)
app.post("/messages/ack", (req, res) => {
  const ids = (req.body?.ids ?? []) as number[];
  if (!Array.isArray(ids) || !ids.length) return res.json({ ok: true });
  const stmt = db.prepare("DELETE FROM messages WHERE id=?");
  db.transaction(() => { ids.forEach(id => stmt.run(id)); })();
  res.json({ ok: true, deleted: ids.length });
});

const PORT = Number(process.env.PORT || 8020);
app.listen(PORT, () => console.log(`E2E mailbox listening on :${PORT}`));

 
