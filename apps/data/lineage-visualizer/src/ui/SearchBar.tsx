
import { useState } from "react";
import { Search } from "lucide-react";

type SearchBarProps = {
  onSearch: (query: string) => void;
};

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState("");

  const handleSearch = () => {
    onSearch(value.trim());
  };

  return (
    <div className="absolute top-4 left-4 flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 shadow-lg">
      <Search className="w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        placeholder="Search nodes..."
        className="bg-transparent outline-none text-sm text-gray-200 placeholder-gray-500"
      />
      <button
        onClick={handleSearch}
        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded-md text-white"
      >
        Go
      </button>
    </div>
  );
}


