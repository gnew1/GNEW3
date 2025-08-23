"use client";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
ChartJS.register(ArcElement, Tooltip, Legend);

export function DonutChart({ labels, values }: { labels: string[]; values: number[] }) {
  const data = {
    labels,
    datasets: [{ data: values }]
  };
  const opts = { cutout: "65%" } as any;
  return <div style={{width:"100%", height:320}}><Doughnut data={data} options={opts} /></div>;
}

