"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DataPoint = {
  date: string;
  weightKg: number | null;
};

interface WeightChartProps {
  data: DataPoint[];
}

export function WeightChart({ data }: WeightChartProps) {
  const filtered = data.filter((d) => d.weightKg !== null);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[#555] text-sm">
        No weight data yet. Log your first entry below.
      </div>
    );
  }

  const formatted = filtered.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    weight: d.weightKg,
  }));

  const weights = filtered.map((d) => d.weightKg as number);
  const minWeight = Math.floor(Math.min(...weights) - 2);
  const maxWeight = Math.ceil(Math.max(...weights) + 2);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#555" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[minWeight, maxWeight]}
          tick={{ fontSize: 11, fill: "#555" }}
          tickLine={false}
          axisLine={false}
          unit=" kg"
        />
        <Tooltip
          contentStyle={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#fff",
          }}
          labelStyle={{ color: "#999" }}
          formatter={(value: number | undefined) =>
            value !== undefined ? [`${value} kg`, "Weight"] : ["—", "Weight"]
          }
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#00d4ff"
          strokeWidth={2.5}
          dot={{ fill: "#00d4ff", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "#00d4ff" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
