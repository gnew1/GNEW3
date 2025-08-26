
import React from "react";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar } from "recharts";

type Props = Readonly<{ metrics: { lang: string; runs: number; avgSeconds: number }[] }>;

export function QuickstartChart({ metrics }: Props) {
  return (
    <div style={{ width: "100%", height: 400 }}>
      <ResponsiveContainer>
        <BarChart data={metrics}>
          <XAxis dataKey="lang" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="runs" fill="#0f766e" name="Total runs" />
          <Bar dataKey="avgSeconds" fill="#82ca9d" name="Avg T2D (s)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


