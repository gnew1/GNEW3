
import { Router } from "express";
import { z } from "zod";
import Busboy from "busboy";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { aesGcmEncrypt, aesGcmDecrypt, genDEK } from "../crypto.js";
import { ensureActiveKek, unwrapDEK, wrapDEK } from "../kek.js";

export const objects = Router();

const uploadSchema = z.object({
  filename: z.string().optional(),
  mimeType: z.string().optional(),
  userId: z.string()
});

// Upload encrypted object
objects.post("/", (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  const chunks: Buffer[] = [];
  let metadata: any = {};

  busboy.on("field", (name, value) => {
    metadata[name] = value;
  });

  busboy.on("file", (name, file, info) => {
    file.on("data", (chunk) => chunks.push(chunk));
    
    file.on("end", async () => {
      try {
        const validation = uploadSchema.parse(metadata);
        const content = Buffer.concat(chunks);
        
        // Generate new DEK for this object
        const dek = genDEK();
        const kek = await ensureActiveKek();
        const wrappedDEK = await wrapDEK(dek, kek);
        
        // Encrypt content with DEK
        const encrypted = aesGcmEncrypt(content, dek);
        
        // Store in database
        const id = nanoid();
        db.prepare(`
          INSERT INTO objects (id, user_id, filename, mime_type, wrapped_dek, encrypted_data, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, validation.userId, info.filename || "untitled", info.mimeType || "application/octet-stream", wrappedDEK, encrypted, Date.now());
        
        res.json({ id, filename: info.filename, size: content.length });
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
      }
    });
  });

  busboy.on("error", (error) => {
    res.status(400).json({ error: error.message });
  });

  req.pipe(busboy);
});

// Download encrypted object
objects.get("/:id", async (req, res) => {
  try {
    const obj = db.prepare("SELECT * FROM objects WHERE id = ?").get(req.params.id) as any;
    if (!obj) return res.status(404).json({ error: "Object not found" });
    
    // Unwrap DEK and decrypt
    const kek = await ensureActiveKek();
    const dek = await unwrapDEK(obj.wrapped_dek, kek);
    const decrypted = aesGcmDecrypt(obj.encrypted_data, dek);
    
    res.setHeader("Content-Type", obj.mime_type);
    res.setHeader("Content-Disposition", `attachment; filename="${obj.filename}"`);
    res.send(decrypted);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

