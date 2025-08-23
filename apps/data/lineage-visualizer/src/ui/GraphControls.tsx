
import { ZoomIn, ZoomOut, Move } from "lucide-react";
import { Button } from "@/components/ui/button";

type GraphControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export function GraphControls({ onZoomIn, onZoomOut, onReset }: GraphControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 flex gap-2 bg-gray-900 p-2 rounded-xl shadow-xl border border-gray-700">
      <Button
        size="icon"
        variant="ghost"
        onClick={onZoomIn}
        className="text-green-400 hover:text-white hover:bg-gray-800"
      >
        <ZoomIn className="w-5 h-5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onZoomOut}
        className="text-green-400 hover:text-white hover:bg-gray-800"
      >
        <ZoomOut className="w-5 h-5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onReset}
        className="text-green-400 hover:text-white hover:bg-gray-800"
      >
        <Move className="w-5 h-5" />
      </Button>
    </div>
  );
}


