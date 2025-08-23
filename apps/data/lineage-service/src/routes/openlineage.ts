
import { Router } from "express";
import { db } from "../db.js";

export const openlineage = Router();

/** Export mínimo a OpenLineage events (run facets reducidas) */
openlineage.get("/events", (req, res) => {
  const since = new Date(String(req.query.since ?? "1970-01-01") + "T00:00:00Z").getTime();
  const until = new Date(String(req.query.until ?? "2999-12-31") + "T23:59:59Z").getTime();

  const jobs = db.prepare("SELECT * FROM jobs WHERE startedAt BETWEEN ? AND ? ORDER BY startedAt ASC").all(since, until) as any[];
  const datasetsMap = new Map<string, any>();
  const out: any[] = [];

  for (const j of jobs) {
    const edges = db.prepare("SELECT * FROM edges WHERE runId=?").all(j.runId) as any[];
    const inputsIds  = Array.from(new Set(edges.filter(e => e.type === "READ"  && e.dstDatasetId).map(e => e.dstDatasetId)));
    const outputsIds = Array.from(new Set(edges.filter(e => e.type === "WRITE" && e.dstDatasetId).map(e => e.dstDatasetId)));
    const getDs = (id: string) => {
      if (!datasetsMap.has(id)) {
        const d = db.prepare("SELECT * FROM datasets WHERE id=?").get(id) as any;
        datasetsMap.set(id, d);
      }
      const d = datasetsMap.get(id);
      return { namespace: d.namespace, name: d.name };
    };

    out.push({
      eventType: j.status === "running" ? "START" : j.status === "completed" ? "COMPLETE" : "FAIL",
      eventTime: new Date(j.startedAt).toISOString(),
      run: { runId: j.runId },
      job: { namespace: j.pipeline ?? "default", name: j.jobName },
      inputs: inputsIds.map(getDs),
      outputs: outputsIds.map(getDs),
      producer: j.producer ?? "gnew/lineage-service"
    });
  }
  res.json({ events: out });
});


