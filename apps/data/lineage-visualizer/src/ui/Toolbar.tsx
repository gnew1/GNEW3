
import { Button } from "@/components/ui/button";
import { Download, Upload, RefreshCcw } from "lucide-react";

type ToolbarProps = {
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
};

export function Toolbar({ onExport, onImport, onReset }: ToolbarProps) {
  return (
    <div className="absolute top-4 left-4 flex gap-2 bg-gray-900/70 p-2 rounded-xl shadow-lg">
      <Button
        variant="secondary"
        size="sm"
        className="flex items-center gap-2"
        onClick={onExport}
      >
        <Download className="w-4 h-4" />
        Export
      </Button>
      <Button
        variant="secondary"
        size="sm"
        className="flex items-center gap-2"
        onClick={onImport}
      >
        <Upload className="w-4 h-4" />
        Import
      </Button>
      <Button
        variant="secondary"
        size="sm"
        className="flex items-center gap-2"
        onClick={onReset}
      >
        <RefreshCcw className="w-4 h-4" />
        Reset
      </Button>
    </div>
  );
}


