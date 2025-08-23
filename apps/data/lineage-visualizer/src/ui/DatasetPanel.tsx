
export function DatasetPanel({ dataset }: { dataset:any }) {
  if (!dataset) return <div className="p-4 text-gray-400">Select a node</div>;
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">{dataset.name}</h2>
      <p className="text-sm text-gray-400">{dataset.id}</p>
      {/* Extra: later fetch quality metrics */}
    </div>
  );
}

Notas de implementación

React + d3-force para grafo dinámico.

App.tsx ya conecta a lineage-tracker en localhost:8116.

DatasetPanel placeholder para extender con métricas de calidad (N174).

Preparado para navegación upstream/downstream en siguientes prompts.

