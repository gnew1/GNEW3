
import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { computeScores, fingerprint } from "../scorer.js";
import { getPolicy } from "../policy.js";
import { writeAudit } from "../audit.js";
import { notify } from "../notifier.js";

export const moderate = Router();

const Req = z.object({
  text: z.string().min(1),
  lang: z.string().optional(),
  userId: z.string().optional(),
  context: z.record(z.any()).optional()
});

moderate.post("/", (req, res) => {
  const p = Req.parse(req.body ?? {});
  const pol = getPolicy();

  const { scores, reasons, lang } = computeScores(p.text, p.lang);
  const decision = decide(scores, p.userId);
  const actions = planActions(decision, scores);

  // persist content (de-dup por hash)
  const hashHex = fingerprint(p.text);
  let contentId: string;
  const row = db.prepare("SELECT id FROM contents WHERE hashHex=?").get(hashHex) as any;
  if (row?.id) {
    contentId = row.id;
  } else {
    contentId = nanoid();
    db.prepare("INSERT INTO contents(id,userId,lang,text,hashHex,createdAt) VALUES(?,?,?,?,?,?)")
      .run(contentId, p.userId ?? null, lang, p.text, hashHex, Date.now());
  }

  const modId = nanoid();
  db.prepare("INSERT INTO moderations(id,contentId,decision,categories,reasons,actions,policyVersion,createdAt) VALUES(?,?,?,?,?,?,?,?)")
    .run(modId, contentId, decision, JSON.stringify(scores), JSON.stringify(reasons), JSON.stringify(actions), pol.version, Date.now());

  writeAudit(contentId, "MODERATED", { decision, scores, reasons, actions, userId: p.userId });
  if (decision !== "allow") notify(`moderation.${decision}`, { contentId, decision, scores });

  res.json({ id: contentId, decision, categories: scores, reasons, actions, policyVersion: pol.version, lang });
});

function decide(scores: Record<string, number>, userId?: string) {
  const pol = getPolicy();
  // hard user lists
  const onDeny = !!db.prepare("SELECT 1 FROM lists WHERE list='denyUsers' AND value=?").get(userId ?? "");
  const onAllow = !!db.prepare("SELECT 1 FROM lists WHERE list='allowUsers' AND value=?").get(userId ?? "");
  if (onDeny) return "block";
  // thresholds
  for (const [cat, s] of Object.entries(scores)) {
    if (s >= (pol.block as any)[cat]) return "block";
  }
  for (const [cat, s] of Object.entries(scores)) {
    if (s >= (pol.review as any)[cat]) return onAllow ? "allow" : "review";
  }
  return "allow";
}

function planActions(decision: "allow"|"review"|"block", scores: Record<string, number>) {
  const acts: string[] = [];
  if (decision === "block") acts.push("suppress");
  if (decision === "review") acts.push("queue:manual_review");
  // PII masking suggestion if detected
  if ((scores.pii ?? 0) >= 0.6) acts.push("mask_pii");
  if ((scores.spam ?? 0) >= 0.8) acts.push("throttle:user");
  return acts;
}


