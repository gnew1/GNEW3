
import React, { useEffect, useRef } from "react";

type MiniMapProps = {
  nodes: { id: string; name: string; type: string }[];
  links: { source: string; target: string; jobName: string }[];
  highlight?: string | null;
  onSelect: (id: string) => void;
};

export function MiniMap({ nodes, links, highlight, onSelect }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw links
    ctx.strokeStyle = "#555";
    links.forEach((link) => {
      const sourceIndex = nodes.findIndex((n) => n.id === link.source);
      const targetIndex = nodes.findIndex((n) => n.id === link.target);
      if (sourceIndex === -1 || targetIndex === -1) return;

      ctx.beginPath();
      ctx.moveTo(30, 20 + sourceIndex * 20);
      ctx.lineTo(120, 20 + targetIndex * 20);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach((n, idx) => {
      const isHighlighted =
        highlight &&
        n.name.toLowerCase().includes(highlight.toLowerCase());

      ctx.fillStyle = isHighlighted ? "#3b82f6" : "#999";
      ctx.beginPath();
      ctx.arc(30, 20 + idx * 20, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [nodes, links, highlight]);

  return (
    <div className="absolute bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-2 shadow-lg">
      <canvas
        ref={canvasRef}
        width={150}
        height={150}
        className="cursor-pointer"
        onClick={() => {
          if (highlight) {
            const targetNode = nodes.find((n) =>
              n.name.toLowerCase().includes(highlight.toLowerCase())
            );
            if (targetNode) onSelect(targetNode.id);
          }
        }}
      />
      <p className="text-xs text-gray-400 mt-1 text-center">MiniMap</p>
    </div>
  );
}


