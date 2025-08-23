
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { nanoid } from "nanoid";
import { writeAudit } from "../audit.js";

export const labels = Router();

labels.post("/", (req, res) => {
  const P = z.object({ contentId: z.string().min(5), label: z.enum(["allowed","blocked","needs_changes"]), note: z.string().optional() });
  const p = P.parse(req.body ?? {});
  const id = nanoid();
  db.prepare("INSERT INTO labels(id,contentId,label,note,createdAt) VALUES(?,?,?,?,?)")
    .run(id, p.contentId, p.label, p.note ?? null, Date.now());
  writeAudit(p.contentId, "LABEL", p);
  res.json({ ok: true, id });
});


