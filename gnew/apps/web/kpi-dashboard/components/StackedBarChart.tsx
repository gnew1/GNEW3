import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
type BarDef = { dataKey: string; name: string };
export function StackedBarChart({ data, bars }: { data: any[]; bars: BarDef[] }) {
  return (
    <div style={{width:"100%", height:320}}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date"/>
          <YAxis />
          <Tooltip />
          <Legend />
          {bars.map((b) => (
            <Bar key={b.dataKey} dataKey={b.dataKey} name={b.name} stackId="S" />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

