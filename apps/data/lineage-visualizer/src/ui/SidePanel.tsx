
import { X } from "lucide-react";

type SidePanelProps = {
  node: { id: string; name: string; type: string } | null;
  onClose: () => void;
};

export function SidePanel({ node, onClose }: SidePanelProps) {
  if (!node) return null;

  return (
    <div className="absolute right-0 top-0 w-80 h-full bg-gray-900 border-l border-gray-700 shadow-lg flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">{node.name}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 text-gray-300 space-y-2 text-sm">
        <p><span className="font-medium text-gray-400">ID:</span> {node.id}</p>
        <p><span className="font-medium text-gray-400">Type:</span> {node.type}</p>
        <p className="mt-4 text-gray-400 italic">
          Additional metadata and lineage details will appear here.
        </p>
      </div>
    </div>
  );
}


