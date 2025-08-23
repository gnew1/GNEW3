
import { Router } from "express";
import { db } from "../db.js";
import { getRecordOnChain } from "../onchain.js";

export const verify = Router();

verify.get("/:docId/:ver", async (req, res) => {
  const { docId, ver } = req.params;
  const v = Number(ver);
  const cur = db.prepare("SELECT * FROM versions WHERE docId=? AND version=?").get(docId, v) as any;
  if (!cur) return res.status(404).json({ ok: false, error: "version_not_found" });

  const on = await getRecordOnChain(cur.sha256Hex);
  if (!on.found) {
    return res.json({ ok: false, reason: "not_found_on_chain", sha256Hex: cur.sha256Hex });
  }
  const ok = on.docId === docId && Number(on.version) === v;
  res.json({ ok, onchain: on, local: { docId, version: v, sha256Hex: cur.sha256Hex } });
});


