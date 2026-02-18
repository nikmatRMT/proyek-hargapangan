import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency } from "../../utils/format";

type AnyRow = Record<string, unknown>;

type Props = {
  data?: AnyRow[];
  title?: string;
  height?: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 p-2 rounded-lg shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-bold text-foreground">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export function CommodityBarChart({
  data,
  title = "Rata-rata Harga Komoditas (Top 10)",
  height = 300,
}: Props) {
  const safeData = React.useMemo(() => {
    const src = Array.isArray(data) ? data : [];
    return src
      .map((it) => {
        const label =
          (it?.name as string) ??
          (it?.commodity as string) ??
          (it?.market as string) ??
          (it?.label as string) ??
          "Tidak diketahui";

        const value = num(
          (it as any)?.harga ??
          (it as any)?.value ??
          (it as any)?.avg ??
          (it as any)?.count
        );

        return {
          label: (label ?? "Tidak diketahui").toString().trim() || "Tidak diketahui",
          value,
        };
      })
      .filter((r) => r.value > 0);
  }, [data]);

  const { total, pctByLabel } = React.useMemo(() => {
    const t = safeData.reduce((s, r) => s + r.value, 0);
    const map: Record<string, number> = {};
    safeData.forEach((r) => {
      map[r.label] = t > 0 ? Math.round((r.value / t) * 100) : 0;
    });
    return { total: t, pctByLabel: map };
  }, [safeData]);

  if (!safeData.length) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-muted-foreground h-full min-h-[200px] border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
        Tidak ada data.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={safeData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-800" />
        <XAxis type="number" hide />
        <YAxis
          dataKey="label"
          type="category"
          width={100}
          tick={{ fontSize: 11, fill: '#6B7280' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
        <Bar
          dataKey="value"
          fill="#10b981"
          radius={[0, 4, 4, 0]}
          barSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
