import { jsx as _jsx } from "react/jsx-runtime";
export function LineChart({ data, xKey, yKey, height = 240, ...rest }) {
    // Minimal placeholder chart: renders points as a polyline by index
    const flat = data[0]?.data ?? [];
    const w = 600;
    const h = height;
    if (flat.length === 0)
        return _jsx("div", { style: { height }, children: "No data" });
    const ys = flat.map(p => p.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const normY = (y) => h - (h - 20) * (y - minY) / (maxY - minY || 1) - 10;
    const points = flat.map((p, i) => `${(i / (flat.length - 1)) * w},${normY(p.y)}`).join(' ');
    return (_jsx("svg", { width: "100%", viewBox: `0 0 ${w} ${h}`, height: h, ...rest, children: _jsx("polyline", { fill: "none", stroke: "#2563eb", strokeWidth: 2, points: points }) }));
}
