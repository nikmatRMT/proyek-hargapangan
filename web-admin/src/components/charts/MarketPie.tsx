import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

// Menerima salah satu bentuk:
// - { name, value }
// - { market, count }
// Akan dinormalisasi -> { name, value }
type AnyRow = Record<string, unknown>;

type Props = {
  data?: AnyRow[];
  title?: string;
  height?: number;
};

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042",
  "#8884D8", "#82CA9D", "#f97316", "#14b8a6",
];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function MarketPie({ data, title = "Distribusi Pasar", height = 260 }: Props) {
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">Persentase data per pasar</p>
        </div>
        <div className="p-6">
          <div className="text-sm text-gray-500">Tidak ada data untuk ditampilkan.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">Persentase data per pasar</p>
      </div>

      <div className="p-6">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={safeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => {
                const p = typeof percent === 'number' ? percent : Number(percent ?? 0);
                return `${name} ${(p * 100).toFixed(0)}%`;
              }}
              outerRadius={90}
              dataKey="value"
              isAnimationActive={false}
            >
              {safeData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip
              formatter={(v: number, name: string) => {
                const val = Number(v) || 0;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return [`${val} (${pct}%)`, name];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
