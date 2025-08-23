
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type ImportButtonProps = {
  onImport: (data: {
    nodes: { id: string; name: string; type: string }[];
    links: { source: string; target: string; jobName: string }[];
  }) => void;
};

export function ImportButton({ onImport }: ImportButtonProps) {
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = async () => {
      if (input.files?.length) {
        const file = input.files[0];
        const text = await file.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed.nodes && parsed.links) {
            onImport(parsed);
          } else {
            alert("Invalid JSON structure");
          }
        } catch {
          alert("Failed to parse JSON");
        }
      }
    };

    input.click();
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      className="absolute top-4 left-64 flex items-center gap-2"
      onClick={handleImport}
    >
      <Upload className="w-4 h-4" />
      Import JSON
    </Button>
  );
}


