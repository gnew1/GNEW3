
import { useState } from "react";
import { Graph } from "./ui/Graph";
import { SearchSidebar } from "./ui/SearchSidebar";

const mockData = {
  nodes: [
    { id: "dataset-1", name: "Sales Data" },
    { id: "dataset-2", name: "Customer Data" },
    { id: "dataset-3", name: "Revenue Report" },
  ],
  links: [
    { source: "dataset-1", target: "dataset-3", jobName: "Aggregate Sales" },
    { source: "dataset-2", target: "dataset-3", jobName: "Join Customers" },
  ],
};

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = (query: string) => {
    const filtered = mockData.nodes.filter((n) =>
      n.name.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered.map((f) => ({ ...f, type: "Dataset" })));
  };

  const handleSelect = (nodeId: string) => {
    console.log("Selected node:", nodeId);
    setSearchOpen(false);
  };

  return (
    <div className="w-full h-screen bg-gray-950 text-white relative">
      <Graph data={mockData} onSelect={(d) => console.log(d)} />
      <button
        onClick={() => setSearchOpen(true)}
        className="absolute top-4 right-4 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg shadow"
      >
        Search
      </button>
      {searchOpen && (
        <SearchSidebar
          onClose={() => setSearchOpen(false)}
          onSearch={handleSearch}
          results={results}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}

Cambios realizados (Prompt N184)

Se añadió SearchSidebar como panel lateral para buscar datasets/jobs.

Incluye Input, Button y lista de resultados clicables.

En App.tsx, botón "Search" abre/cierra el sidebar.

Implementada lógica básica de búsqueda filtrando los nodos mockData.

Con esto, la visualización tiene ahora funcionalidad de búsqueda integrada, mejorando la exploración de lineage.

