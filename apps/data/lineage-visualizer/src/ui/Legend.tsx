
import { Square } from "lucide-react";

type LegendProps = {
  items: { label: string; color: string }[];
};

export function Legend({ items }: LegendProps) {
  return (
    <div className="absolute top-4 right-4 bg-gray-900 border border-gray-700 rounded-xl shadow-lg p-3">
      <h3 className="text-sm font-semibold text-gray-200 mb-2">Legend</h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm text-gray-300">
            <Square className="w-4 h-4" style={{ color: item.color }} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


