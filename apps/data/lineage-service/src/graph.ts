
import { db } from "./db.js";

export type Direction = "upstream" | "downstream" | "both";

export function lineageGraph(datasetKey: string, depth = 2, direction: Direction = "both", includeColumns = false) {
  const start = db.prepare("SELECT id,key,name,namespace FROM datasets WHERE key=?").get(datasetKey) as any;
  if (!start) throw new Error("dataset_not_found");

  type Node = { id: string; key: string; name: string; namespace: string };
  type Edge = { type: string; src?: string; srcCol?: string | null; dst?: string; dstCol?: string | null; runId?: string };

  const nodes: Record<string, Node> = { [start.id]: start };
  const edges: Edge[] = [];

  function addNode(id: string) {
    if (nodes[id]) return;
    const n = db.prepare("SELECT id,key,name,namespace FROM datasets WHERE id=?").get(id) as any;
    if (n) nodes[id] = n;
  }

  let frontier = [start.id];
  const seen = new Set<string>(frontier);

  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const dsId of frontier) {
      if (direction === "upstream" || direction === "both") {
        // upstream: buscar edges donde dst=dsId
        const rows = db.prepare("SELECT * FROM edges WHERE dstDatasetId=?").all(dsId) as any[];
        for (const e of rows) {
          if (e.type === "READ") continue; // READ no aporta origen dataset
          if (e.srcDatasetId) {
            addNode(e.srcDatasetId);
            edges.push({ type: e.type, src: e.srcDatasetId, srcCol: includeColumns ? e.srcColumn : null, dst: e.dstDatasetId, dstCol: includeColumns ? e.dstColumn : null, runId: e.runId });
            if (!seen.has(e.srcDatasetId)) { seen.add(e.srcDatasetId); next.push(e.srcDatasetId); }
          }
        }
      }
      if (direction === "downstream" || direction === "both") {
        // downstream: edges donde src=dsId
        const rows = db.prepare("SELECT * FROM edges WHERE srcDatasetId=?").all(dsId) as any[];
        for (const e of rows) {
          addNode(e.dstDatasetId);
          edges.push({ type: e.type, src: e.srcDatasetId, srcCol: includeColumns ? e.srcColumn : null, dst: e.dstDatasetId, dstCol: includeColumns ? e.dstColumn : null, runId: e.runId });
          if (!seen.has(e.dstDatasetId)) { seen.add(e.dstDatasetId); next.push(e.dstDatasetId); }
        }
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }

  return {
    root: start,
    nodes: Object.values(nodes),
    edges
  };
}

export function impact(datasetKey: string, column?: string, kind: "remove" | "type_change" = "remove") {
  // Impacto downstream: nodos/columnas afectadas
  const g = lineageGraph(datasetKey, 5, "downstream", true);
  if (!column) {
    const affected = g.edges.filter(e => e.src === g.root.id).map(e => e.dst).filter(Boolean) as string[];
    const uniq = Array.from(new Set(affected));
    return { affectedDatasets: uniq.map(id => g.nodes.find(n => n.id === id)).filter(Boolean) };
  }
  // Columna específica
  const affectedCols: Array<{ datasetKey: string; column: string | null }> = [];
  for (const e of g.edges) {
    if (e.type === "DERIVE" && e.src === g.root.id && e.srcCol === column) {
      affectedCols.push({ datasetKey: (g.nodes.find(n => n.id === e.dst!) as any).key, column: e.dstCol ?? null });
    }
  }
  return { kind, from: { datasetKey, column }, affected: affectedCols };
}


