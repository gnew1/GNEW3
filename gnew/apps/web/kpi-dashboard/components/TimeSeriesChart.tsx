import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar
} from "recharts";

type LineDef = { dataKey: string; name: string; yAxisId?: string };
export function TimeSeriesChart({ data, lines }: { data: any[]; lines: LineDef[] }) {
  return (
    <div style={{width:"100%", height:320}}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date"/>
          <YAxis yAxisId="L" />
          <YAxis orientation="right" yAxisId="R" />
          <Tooltip />
          <Legend />
          {lines.map((l, i) => (
            <Line key={i} type="monotone" dataKey={l.dataKey} name={l.name} yAxisId={l.yAxisId || "L"} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

