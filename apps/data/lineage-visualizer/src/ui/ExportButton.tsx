
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExportButtonProps = {
  data: {
    nodes: { id: string; name: string; type: string }[];
    links: { source: string; target: string; jobName: string }[];
  };
};

export function ExportButton({ data }: ExportButtonProps) {
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "lineage-export.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      className="absolute top-4 left-40 flex items-center gap-2"
      onClick={handleExport}
    >
      <Download className="w-4 h-4" />
      Export JSON
    </Button>
  );
}


