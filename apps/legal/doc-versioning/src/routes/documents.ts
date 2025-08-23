
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";
import { sha256Hex } from "../crypto.js";
import { writeAudit } from "../audit.js";

export const documents = Router();

const Create = z.object({
  title: z.string().min(3),
  type: z.string().default("policy"),
  content: z.object({ type: z.enum(["base64","text"]), data: z.string().min(1) }),
  mime: z.string().optional()
});

documents.post("/", (req, res) => {
  const p = Create.parse(req.body ?? {});
  const id = nanoid();
  const now = Date.now();
  db.prepare("INSERT INTO documents(id,title,type,createdAt) VALUES(?,?,?,?)")
    .run(id, p.title, p.type, now);

  const bytes = p.content.type === "base64" ? Buffer.from(p.content.data, "base64") : Buffer.from(p.content.data, "utf8");
  const hash = sha256Hex(bytes);

  const vid = nanoid();
  db.prepare("INSERT INTO versions(id,docId,version,mime,size,sha256Hex,content,createdAt) VALUES(?,?,?,?,?,?,?,?)")
    .run(vid, id, 1, p.mime ?? null, bytes.byteLength, hash, Buffer.from(bytes).toString("base64"), now);

  writeAudit(id, "DOC_CREATED", { id, title: p.title, version: 1, sha256: hash });
  res.json({ id, version: 1, sha256Hex: hash });
});

documents.get("/:id", (req, res) => {
  const d = db.prepare("SELECT * FROM documents WHERE id=?").get(req.params.id) as any;
  if (!d) return res.status(404).json({ error: "not_found" });
  const versions = db.prepare(`
    SELECT version, sha256Hex, size, mime, createdAt, onchainRegistered, onchainTxHash, onchainNetwork
    FROM versions WHERE docId=? ORDER BY version DESC LIMIT 100
  `).all(req.params.id) as any[];
  res.json({ document: d, versions });
});


