
import { useState, useEffect } from "react";
import { Graph } from "../ui/Graph";
import { DatasetPanel } from "../ui/DatasetPanel";

export default function App() {
  const [selected, setSelected] = useState<any>(null);
  const [graph, setGraph] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });

  useEffect(() => {
    fetch("http://localhost:8116/lineage/downstream?datasetId=demo")
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setGraph({
            nodes: d.items.map((x: any) => ({ id: x.id, name: x.name })),
            links: d.items.slice(1).map((x: any) => ({ source: "demo", target: x.id }))
          });
        }
      });
  }, []);

  return (
    <div className="flex h-screen">
      <div className="flex-1">
        <Graph data={graph} onSelect={setSelected} />
      </div>
      <div className="w-80 border-l border-gray-700">
        <DatasetPanel dataset={selected} />
      </div>
    </div>
  );
}


