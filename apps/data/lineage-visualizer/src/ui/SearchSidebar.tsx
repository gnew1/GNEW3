
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type SearchSidebarProps = {
  onClose: () => void;
  onSearch: (query: string) => void;
  results: { id: string; name: string; type: string }[];
  onSelect: (nodeId: string) => void;
};

export function SearchSidebar({
  onClose,
  onSearch,
  results,
  onSelect,
}: SearchSidebarProps) {
  const [query, setQuery] = useState("");

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 p-4 shadow-2xl z-40 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-green-400">Search</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search datasets or jobs..."
          className="flex-1"
        />
        <Button onClick={() => onSearch(query)} variant="default">
          Go
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {results.length === 0 && (
          <p className="text-sm text-gray-500">No results found</p>
        )}
        {results.map((r) => (
          <div
            key={r.id}
            onClick={() => onSelect(r.id)}
            className="cursor-pointer p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
          >
            <p className="text-white">{r.name}</p>
            <p className="text-xs text-gray-400">{r.type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}


