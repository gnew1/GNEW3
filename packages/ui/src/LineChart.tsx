import React from 'react';

type Series = { id: string; data: { x: string|number|Date; y: number }[] };

export function LineChart({ data, xKey, yKey, height = 240, ...rest }: { data: Series[]; xKey: string; yKey: string; height?: number } & React.SVGProps<SVGSVGElement>) {
  // Minimal placeholder chart: renders points as a polyline by index
  const flat = data[0]?.data ?? [];
  const w = 600; const h = height;
  if (flat.length === 0) return <div style={{ height }}>No data</div>;
  const ys = flat.map(p => p.y);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const normY = (y: number) => h - (h - 20) * (y - minY) / (maxY - minY || 1) - 10;
  const points = flat.map((p, i) => `${(i/(flat.length-1))*w},${normY(p.y)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} height={h} {...rest}>
      <polyline fill="none" stroke="#2563eb" strokeWidth={2} points={points} />
    </svg>
  );
}
