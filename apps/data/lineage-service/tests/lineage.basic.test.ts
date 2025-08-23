
import { ingest } from "../src/ingest.js";
import { lineageGraph, impact } from "../src/graph.js";
import "../src/db.js";

test("ingest bronze->silver ETL and query graph", () => {
  ingest({
    run: { runId: "r1", jobName: "bronze_to_silver", pipeline: "etl", status: "completed" },
    reads: [{ namespace: "raw", name: "orders" }],
    writes: [{ namespace: "curated", name: "orders_silver", schema: [{ name: "order_id", type: "string", nullable: false }, { name: "amount", type: "decimal" }] }],
    mappings: [
      { from: { dataset: "raw.orders", column: "id" }, to: { dataset: "curated.orders_silver", column: "order_id" }, transform: "cast(id as string)" },
      { from: { dataset: "raw.orders", column: "amount_cents" }, to: { dataset: "curated.orders_silver", column: "amount" }, transform: "amount_cents/100" }
    ]
  });

  const g = lineageGraph("curated.orders_silver", 2, "upstream", true);
  expect(g.nodes.length).toBeGreaterThanOrEqual(2);
  expect(g.edges.some(e => e.type === "DERIVE" && e.dstCol === "order_id")).toBe(true);

  const im = impact("raw.orders", "amount_cents", "remove");
  expect(im.affected.length).toBeGreaterThan(0);
});


