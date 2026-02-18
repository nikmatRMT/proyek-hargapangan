import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

type AnyRow = Record<string, unknown>;

type Props = {
  data?: AnyRow[];
  title?: string;
  height?: number;
};

// Modern color palette (Greens/Teals/Blues)
const COLORS = [
  "#10b981", // Emerald 500
  "#0ea5e9", // Sky 500
  "#f59e0b", // Amber 500
  "#6366f1", // Indigo 500
  "#ec4899", // Pink 500
  "#8b5cf6", // Violet 500
  "#14b8a6", // Teal 500
  "#84cc16", // Lime 500
];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 p-2 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-foreground">{payload[0].name}</p>
        <p className="text-xs text-muted-foreground">
          {payload[0].value} ({payload[0].payload.percent}%)
        </p>
      </div>
    );
  }
  return null;
};

export function MarketPie({ data, title = "Distribusi Pasar", height = 300 }: Props) {
  const safeData = React.useMemo(() => {
    const src = Array.isArray(data) ? data : [];
    return src
      .map((d) => ({
        name:
          (d?.name as string) ??
          (d?.market as string) ??
          "Tidak diketahui",
        value: num((d as any)?.value ?? (d as any)?.count),
      }))
      .filter((d) => d.value > 0)
      .map((d) => ({
        name: (d.name ?? "Tidak diketahui").toString().trim() || "Tidak diketahui",
        value: d.value,
      }));
  }, [data]);

  const total = safeData.reduce((s, d) => s + d.value, 0);

  if (!safeData.length || total <= 0) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-muted-foreground h-full min-h-[200px] border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
        Tidak ada data untuk ditampilkan.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={safeData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          isAnimationActive={true} // Enable animation
        >
          {safeData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
